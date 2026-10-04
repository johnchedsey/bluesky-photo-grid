import subprocess

from .s3 import S3CDN


class S3CloudFrontCDN(S3CDN):
    def upload_files(self, files_to_upload, output_dir):
        super().upload_files(files_to_upload, output_dir)

        dist_id = self.config["aws"]["cloudfront_dist_id"]
        subprocess.run([
            "aws", "cloudfront", "create-invalidation",
            "--distribution-id", dist_id,
            "--paths", "/*",
        ], check=True)
        print(f"Invalidated CloudFront distribution {dist_id}.")
