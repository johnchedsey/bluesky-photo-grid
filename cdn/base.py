import shutil
from abc import ABC, abstractmethod
from pathlib import Path


class CDN(ABC):
    def __init__(self, config):
        self.config = config

    @abstractmethod
    def upload_files(self, files_to_upload: list[str], output_dir: Path):
        pass


def copy_files(files, src_dir, dst_dir):
    """Copy relative paths from src_dir into dst_dir, creating directories as needed."""
    for rel_path in files:
        dst = dst_dir / rel_path
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_dir / rel_path, dst)
