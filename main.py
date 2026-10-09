#!/usr/bin/env python3
"""Build a static photo gallery site from a Bluesky account and publish it to a CDN."""
import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape

import requests
import yaml
from jinja2 import Environment, FileSystemLoader
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from cdn import get_cdn

ROOT = Path(__file__).parent
API_BASE = "https://bsky.social/xrpc"
REQUEST_TIMEOUT = 20
FAVICONS = ("favicon.png", "favicon.svg", "favicon.ico")
NSFW_LABELS = {"porn", "sexual", "nudity", "graphic-media", "spam", "!hide", "!warn"}
LAYOUTS = {"justified", "masonry", "columns"}

REQUIRED_KEYS = {
    "bluesky": ["handle", "app_password"],
    "output": ["directory", "posts_per_page"],
    "website": ["title", "subtitle", "footer", "base_url"],
    "cdn": ["type"],
}
DEFAULTS = {
    "bluesky": {"max_posts": 1000, "hashtag": "#photography"},
    "output": {"highres_tile": False, "host_images": False, "layout": "justified"},
}


# --- Config ---------------------------------------------------------------

def load_config(path):
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")
    config = yaml.safe_load(path.read_text(encoding="utf-8")) or {}

    missing = []
    for section, keys in REQUIRED_KEYS.items():
        if section not in config:
            missing.append(section)
            continue
        missing.extend(f"{section}.{key}" for key in keys if key not in config[section])
    if missing:
        raise KeyError("Missing required config keys: " + ", ".join(missing))

    for section, defaults in DEFAULTS.items():
        for key, value in defaults.items():
            config[section].setdefault(key, value)

    if config["output"]["layout"] not in LAYOUTS:
        raise ValueError(f"output.layout must be one of: {', '.join(sorted(LAYOUTS))}")
    return config


# --- Bluesky API ----------------------------------------------------------

def make_http_session():
    """A requests session that retries transient failures with backoff."""
    retry = Retry(
        total=3,
        backoff_factor=2,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
    )
    session = requests.Session()
    session.mount("https://", HTTPAdapter(max_retries=retry))
    return session


def login(http, handle, password):
    resp = http.post(
        f"{API_BASE}/com.atproto.server.createSession",
        json={"identifier": handle, "password": password},
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()["accessJwt"]


def is_original_post(item):
    """Exclude reposts (which carry a 'reason') and replies."""
    return "reason" not in item and "reply" not in item.get("post", {}).get("record", {})


def fetch_posts(http, handle, jwt, max_posts):
    """Fetch up to max_posts original posts (no reposts/replies) from the author feed."""
    headers = {"Authorization": f"Bearer {jwt}"}
    posts = []
    cursor = None
    while len(posts) < max_posts:
        params = {"actor": handle, "limit": 100}  # API max per call
        if cursor:
            params["cursor"] = cursor
        try:
            resp = http.get(
                f"{API_BASE}/app.bsky.feed.getAuthorFeed", params=params, headers=headers, timeout=REQUEST_TIMEOUT
            )
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"[ERROR] Failed to fetch posts: {e}")
            print(f"[INFO] Continuing with {len(posts)} posts collected so far")
            break

        data = resp.json()
        feed = data.get("feed", [])
        posts.extend(item for item in feed if is_original_post(item))
        cursor = data.get("cursor")
        if not feed or not cursor:
            break
    return posts[:max_posts]


# --- Image extraction -----------------------------------------------------

def has_hashtag(text, hashtag):
    return hashtag.lower() in text.lower()


def is_nsfw(post):
    return any(label.get("val") in NSFW_LABELS for label in post.get("labels", []))


def download(http, url, dest):
    """Download url to dest unless it already exists. Returns True if dest is present afterwards."""
    if dest.exists():
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    partial = dest.with_name(dest.name + ".part")
    try:
        with http.get(url, stream=True, timeout=REQUEST_TIMEOUT) as resp:
            resp.raise_for_status()
            with open(partial, "wb") as f:
                for chunk in resp.iter_content(8192):
                    f.write(chunk)
        partial.replace(dest)
        return True
    except (requests.RequestException, OSError) as e:
        print(f"[WARN] Failed to download {url}: {e}")
        partial.unlink(missing_ok=True)
        return False


def host_image(http, url, output_dir, filename):
    """Store an image under output_dir/hosted_images; fall back to the remote URL on failure."""
    dest = output_dir / "hosted_images" / filename
    return dest.relative_to(output_dir).as_posix() if download(http, url, dest) else url


def aspect_ratio(img):
    """Width / height from the embed's aspectRatio, or None when Bluesky doesn't report it."""
    ratio = img.get("aspectRatio") or {}
    width, height = ratio.get("width"), ratio.get("height")
    return round(width / height, 4) if width and height else None


def extract_images(posts, handle, output_dir, http, host_images=False, hashtag="#photography"):
    images = []
    for item in posts:
        post = item.get("post", {})
        record = post.get("record", {})
        description = record.get("text", "")
        uri = post.get("uri")
        if not uri or not has_hashtag(description, hashtag):
            continue

        rkey = uri.split("/")[-1]
        post_info = {
            "link": f"https://bsky.app/profile/{handle}/post/{rkey}",
            "description": description,
            "date": record.get("createdAt", "")[:10],
            "likes": post.get("likeCount", 0),
            "reposts": post.get("repostCount", 0),
            "replies": post.get("replyCount", 0),
            "nsfw": is_nsfw(post),
        }

        for i, img in enumerate(post.get("embed", {}).get("images", [])):
            src, thumb = img.get("fullsize"), img.get("thumb")
            if not src:
                continue
            # The first image keeps the bare rkey so existing #img- links stay valid.
            image_id = rkey if i == 0 else f"{rkey}-{i}"
            if host_images:
                src = host_image(http, src, output_dir, f"{image_id}_full.jpg")
                if thumb:
                    thumb = host_image(http, thumb, output_dir, f"{image_id}_thumb.jpg")

            images.append({
                "id": image_id,
                "src": src,
                "thumb": thumb or src,
                "alt": img.get("alt", ""),
                "aspect_ratio": aspect_ratio(img),
                **post_info,
            })
    return images


# --- Site generation ------------------------------------------------------

def write_images_json(images, output_dir):
    json_dir = output_dir / "data"
    json_dir.mkdir(parents=True, exist_ok=True)
    (json_dir / "images.json").write_text(json.dumps(images, indent=2), encoding="utf-8")


def render_index(output_dir, config):
    env = Environment(loader=FileSystemLoader(ROOT))
    html = env.get_template("index_template.html").render(config=config)
    (output_dir / "index.html").write_text(html, encoding="utf-8")


def copy_static_assets(output_dir):
    for name in ("style.css", *FAVICONS):
        src = ROOT / name
        if src.exists():
            shutil.copy2(src, output_dir / name)


def rss_date(date_str):
    try:
        date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        return ""
    return f"\n      <pubDate>{format_datetime(date, usegmt=True)}</pubDate>"


def write_rss_feed(images, output_dir, config, feed_size=25):
    base_url = config["website"]["base_url"].rstrip("/")
    title = escape(config["website"]["title"])

    items = []
    for img in images[:feed_size]:
        link = escape(f"{base_url}/#img-{img['id']}")
        items.append(f"""
    <item>
      <title>{escape(img['description'][:50])}</title>
      <link>{link}</link>
      <description>{escape(img['description'])}</description>{rss_date(img['date'])}
      <guid>{link}</guid>
    </item>""")

    feed = f"""<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{title}</title>
    <link>{escape(base_url)}</link>
    <atom:link href="{escape(base_url)}/feed.xml" rel="self" type="application/rss+xml" />
    <description>{title} RSS feed</description>{''.join(items)}
  </channel>
</rss>
"""
    (output_dir / "feed.xml").write_text(feed, encoding="utf-8")


# --- Publishing -----------------------------------------------------------

def file_hash(path):
    hasher = hashlib.md5()
    with open(path, "rb") as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()


def publish_changes(output_dir, config):
    """Upload files whose content changed since the last run, then record the new hashes."""
    hashes_file = output_dir / ".file_hashes.json"
    prev = json.loads(hashes_file.read_text(encoding="utf-8")) if hashes_file.exists() else {}

    current = {
        path.relative_to(output_dir).as_posix(): file_hash(path)
        for path in output_dir.rglob("*")
        if path.is_file() and path != hashes_file and not path.name.endswith(".part")
    }
    changed = [rel for rel, digest in current.items() if prev.get(rel) != digest]

    if changed:
        get_cdn(config["cdn"]["type"], config).upload_files(changed, output_dir)
    else:
        print("No changes to upload.")

    hashes_file.write_text(json.dumps(current, indent=2), encoding="utf-8")


# --- Entry point ----------------------------------------------------------

def main():
    config_file = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "config.yaml"
    try:
        config = load_config(config_file)
    except (FileNotFoundError, yaml.YAMLError, KeyError, ValueError) as e:
        sys.exit(f"Config Error: {e}")

    bsky = config["bluesky"]
    output_dir = Path(config["output"]["directory"])
    output_dir.mkdir(parents=True, exist_ok=True)

    http = make_http_session()
    try:
        jwt = login(http, bsky["handle"], bsky["app_password"])
    except requests.RequestException as e:
        sys.exit(f"Bluesky login failed: {e}")

    posts = fetch_posts(http, bsky["handle"], jwt, bsky["max_posts"])
    images = extract_images(
        posts,
        bsky["handle"],
        output_dir,
        http,
        host_images=config["output"]["host_images"],
        hashtag=bsky["hashtag"],
    )
    print(f"Found {len(images)} images in {len(posts)} posts.")

    write_images_json(images, output_dir)
    render_index(output_dir, config)
    copy_static_assets(output_dir)
    write_rss_feed(images, output_dir, config)
    publish_changes(output_dir, config)


if __name__ == "__main__":
    main()
