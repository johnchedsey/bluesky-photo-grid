import subprocess
from pathlib import Path

from .base import CDN, copy_files


class GitHubPagesCDN(CDN):
    def upload_files(self, files_to_upload, output_dir):
        repo = Path(self.config["github"]["repo_path"])
        repo.mkdir(parents=True, exist_ok=True)

        def git(*args, check=True):
            return subprocess.run(["git", *args], cwd=repo, check=check)

        if not (repo / ".git").exists():
            git("init")
            git("checkout", "-b", "main")
            git("remote", "add", "origin", self.config["github"]["repo_url"])

        copy_files(files_to_upload, output_dir, repo)

        git("add", ".")
        if git("diff", "--cached", "--quiet", check=False).returncode == 0:
            print("GitHub Pages repo already up to date; nothing to commit.")
            return
        git("commit", "-m", "Update GitHub Pages")
        git("push", "-u", "origin", "main")
        print(f"Uploaded {len(files_to_upload)} files to GitHub Pages ({repo}).")
