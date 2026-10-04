from .github_pages import GitHubPagesCDN
from .local import LocalCDN
from .s3 import S3CDN
from .s3_cloudfront import S3CloudFrontCDN

CDN_TYPES = {
    "local": LocalCDN,
    "s3": S3CDN,
    "s3_cloudfront": S3CloudFrontCDN,
    "github_pages": GitHubPagesCDN,
}


def get_cdn(cdn_type, config):
    try:
        return CDN_TYPES[cdn_type](config)
    except KeyError:
        raise ValueError(f"Unsupported CDN type: {cdn_type} (options: {', '.join(CDN_TYPES)})") from None
