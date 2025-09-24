from kivy.utils import platform
from kivy.clock import Clock
import os

if platform == 'android':
    from jnius import autoclass
    from android import mActivity

class AndroidUtils:
    @staticmethod
    def get_downloads_dir():
        """Return the standard Downloads folder path on Android"""
        if platform != 'android':
            return None
        try:
            Environment = autoclass('android.os.Environment')
            path = Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOWNLOADS
            ).getAbsolutePath()
            return path
        except Exception as e:
            print(f"Failed to get Downloads directory: {e}")
            return None

    @staticmethod
    def ensure_app_permissions():
        """Request and check storage permissions"""
        if platform != 'android':
            return True
        try:
            from storage_permissions import StoragePermission
            return StoragePermission.check_permissions(lambda granted: None)
        except Exception as e:
            print(f"Permission check failed: {e}")
            return False

    @staticmethod
    def get_app_storage_dir():
        """Return the app-specific external storage path"""
        if platform != 'android':
            return None
        try:
            path = mActivity.getExternalFilesDir(None).getAbsolutePath()
            return path
        except Exception as e:
            print(f"Failed to get app storage directory: {e}")
            return None

    @staticmethod
    def schedule_gc():
        """Schedule garbage collection"""
        def run_gc(dt):
            import gc
            gc.collect()
        Clock.schedule_once(run_gc, 2.0)
