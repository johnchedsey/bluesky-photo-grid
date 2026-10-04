from pathlib import Path

from .base import CDN, copy_files


class LocalCDN(CDN):
    def upload_files(self, files_to_upload, output_dir):
        destination = Path(self.config["local"]["directory"])
        copy_files(files_to_upload, output_dir, destination)
        print(f"Copied {len(files_to_upload)} files to local directory: {destination}")
