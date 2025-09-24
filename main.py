import codecs
import gc
import hashlib
import json
import logging
import os
import random
import re
import threading
import time
import zipfile
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Callable

from kivy.event import EventDispatcher
from kivy.app import App
from kivy.clock import Clock
from kivy.core.window import Window
from kivy.lang import Builder
from kivy.logger import Logger
from kivy.metrics import dp
from kivy.properties import NumericProperty, StringProperty, ListProperty, BooleanProperty, ObjectProperty
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.gridlayout import GridLayout
from kivy.uix.label import Label
from kivy.uix.popup import Popup
from kivy.uix.progressbar import ProgressBar
from kivy.uix.scrollview import ScrollView
from kivy.uix.spinner import Spinner
from kivy.uix.textinput import TextInput
from kivy.uix.togglebutton import ToggleButton
from kivy.uix.dropdown import DropDown
from kivy.uix.widget import Widget
from kivy.uix.modalview import ModalView
from kivy.core.clipboard import Clipboard
from kivy.utils import platform
from plyer import filechooser

if platform == 'android':
    try:
        from jnius import autoclass
        from android import mActivity # type: ignore
        from android.permissions import request_permissions, check_permission, Permission # type: ignore
        from android import activity as android_activity # type: ignore
        from android import api_version # type: ignore
    except ImportError as e:
        print("Android-specific imports failed:", e)
        mActivity = None
        android_activity = None
        api_version = 0
        class Permission:
            READ_EXTERNAL_STORAGE = ''
            WRITE_EXTERNAL_STORAGE = ''
else:
    def request_permissions(*args, **kwargs):
        pass
    def check_permission(*args, **kwargs):
        return True
    class Permission:
        READ_EXTERNAL_STORAGE = ''
        WRITE_EXTERNAL_STORAGE = ''
    android_activity = None
    api_version = 0

BUTTON_HEIGHT = dp(48)
POPUP_WIDTH = 0.85
POPUP_HEIGHT = 0.45
SPACING_DEFAULT = dp(12)
PADDING_DEFAULT = dp(16)
COL_BG_NEUTRAL = (0.25, 0.25, 0.25, 1)
COL_BG_CORRECT = (0.2, 0.5, 0.2, 1)
COL_BG_INCORRECT = (0.5, 0.2, 0.2, 1)
COL_BG_SELECTED = (0.15, 0.3, 0.6, 1)

LAB_RANGES = {
    "Full Blood Count (FBC)": [
        {"test": "Haemoglobin (male)", "range": "130–170 g/L", "notes": ""},
        {"test": "Haemoglobin (female)", "range": "115–150 g/L", "notes": ""},
        {"test": "RBC (male)", "range": "4.5–6.0 x10^12/L", "notes": ""},
        {"test": "RBC (female)", "range": "3.9–5.1 x10^12/L", "notes": ""},
        {"test": "Haematocrit/PCV (male)", "range": "0.40–0.52", "notes": ""},
        {"test": "Haematocrit/PCV (female)", "range": "0.36–0.46", "notes": ""},
        {"test": "MCV", "range": "80–100 fL", "notes": ""},
        {"test": "MCH", "range": "27–33 pg", "notes": ""},
        {"test": "MCHC", "range": "320–360 g/L", "notes": ""},
        {"test": "RDW", "range": "11.5–14.5 %", "notes": ""},
        {"test": "WBC", "range": "4.0–11.0 x10^9/L", "notes": ""},
        {"test": "Neutrophils", "range": "2.0–7.5 x10^9/L", "notes": ""},
        {"test": "Lymphocytes", "range": "1.0–4.0 x10^9/L", "notes": ""},
        {"test": "Monocytes", "range": "0.2–0.8 x10^9/L", "notes": ""},
        {"test": "Eosinophils", "range": "0.0–0.4 x10^9/L", "notes": ""},
        {"test": "Basophils", "range": "0.0–0.1 x10^9/L", "notes": ""},
        {"test": "Platelets", "range": "150–400 x10^9/L", "notes": ""},
        {"test": "Reticulocytes", "range": "0.5–2.5 %", "notes": "Lab-specific"},
    ],

    "Urea & Electrolytes (U&E)": [
        {"test": "Sodium (Na+)", "range": "135–145 mmol/L", "notes": ""},
        {"test": "Potassium (K+)", "range": "3.5–5.1 mmol/L", "notes": ""},
        {"test": "Chloride (Cl-)", "range": "98–106 mmol/L", "notes": ""},
        {"test": "Bicarbonate (HCO3-, serum)", "range": "22–29 mmol/L", "notes": ""},
        {"test": "Urea", "range": "2.5–7.8 mmol/L", "notes": ""},
        {"test": "Creatinine (male)", "range": "60–110 umol/L", "notes": "Lab-specific"},
        {"test": "Creatinine (female)", "range": "45–90 umol/L", "notes": "Lab-specific"},
        {"test": "eGFR", "range": ">= 90 mL/min/1.73m2", "notes": "Age/ethnicity dependent"},
        {"test": "Anion gap", "range": "8–16 mmol/L", "notes": "Calculator/lab method dependent"},
        {"test": "Serum osmolality", "range": "275–295 mOsm/kg", "notes": ""},
    ],

    "Liver Function Tests (LFTs)": [
        {"test": "ALT", "range": "< 41 U/L", "notes": "Lab-specific"},
        {"test": "AST", "range": "< 40 U/L", "notes": "If reported"},
        {"test": "ALP (adult)", "range": "30–130 U/L", "notes": "Higher in adolescence/pregnancy"},
        {"test": "GGT", "range": "< 60 U/L", "notes": "Sex/lab-specific"},
        {"test": "Bilirubin (total)", "range": "3–21 umol/L", "notes": ""},
        {"test": "Albumin", "range": "35–50 g/L", "notes": ""},
        {"test": "Total protein", "range": "60–80 g/L", "notes": ""},
    ],

    "Bone & Minerals": [
        {"test": "Calcium (total)", "range": "2.20–2.60 mmol/L", "notes": "Use adjusted Ca if hypoalbuminaemia"},
        {"test": "Ionized calcium", "range": "1.15–1.33 mmol/L", "notes": ""},
        {"test": "Phosphate", "range": "0.8–1.5 mmol/L", "notes": "Higher in children"},
        {"test": "Magnesium", "range": "0.70–1.00 mmol/L", "notes": ""},
        {"test": "Urate (male)", "range": "0.20–0.42 mmol/L", "notes": ""},
        {"test": "Urate (female)", "range": "0.14–0.36 mmol/L", "notes": ""},
        {"test": "25-OH Vitamin D (adequate)", "range": "50–125 nmol/L", "notes": "Deficiency < 25 nmol/L"},
    ],

    "Iron Studies & Vitamins": [
        {"test": "Ferritin (male)", "range": "30–400 ug/L", "notes": "Inflammation increases ferritin"},
        {"test": "Ferritin (female)", "range": "15–200 ug/L", "notes": ""},
        {"test": "Serum iron", "range": "10–30 umol/L", "notes": "Diurnal variation"},
        {"test": "Transferrin", "range": "2.0–3.6 g/L", "notes": ""},
        {"test": "TIBC", "range": "45–72 umol/L", "notes": ""},
        {"test": "Transferrin saturation", "range": "20–45 %", "notes": ""},
        {"test": "Vitamin B12", "range": "200–900 ng/L", "notes": "Assay specific"},
        {"test": "Folate (serum)", "range": "7–45 nmol/L", "notes": "Assay specific"},
    ],

    "Inflammation": [
        {"test": "CRP", "range": "< 5 mg/L", "notes": "Mildly increases with age"},
        {"test": "ESR (adult)", "range": "Lab-specific", "notes": "Age/sex dependent"},
        {"test": "Procalcitonin", "range": "< 0.05 ng/mL", "notes": "Use assay-specific cut-offs for sepsis"},
    ],

    "Thyroid": [
        {"test": "TSH", "range": "0.4–4.0 mU/L", "notes": "Pregnancy-specific ranges differ"},
        {"test": "Free T4", "range": "9–19 pmol/L", "notes": "Assay specific"},
        {"test": "Free T3", "range": "3.1–6.8 pmol/L", "notes": "Assay specific"},
    ],

    "Glucose / Diabetes": [
        {"test": "Fasting glucose", "range": "4.0–5.4 mmol/L", "notes": ""},
        {"test": "Random glucose", "range": "< 7.8 mmol/L", "notes": ""},
        {"test": "2-hr OGTT", "range": "< 7.8 mmol/L", "notes": "Impaired 7.8–11.0; diabetes >= 11.1"},
        {"test": "HbA1c (normal)", "range": "20–41 mmol/mol", "notes": ""},
        {"test": "HbA1c (diabetes)", "range": ">= 48 mmol/mol", "notes": "Diagnosis threshold"},
    ],

    "Lipids (fasting or non-fasting)": [
        {"test": "Total cholesterol", "range": "< 5.0 mmol/L (desirable)", "notes": ""},
        {"test": "LDL-C", "range": "< 3.0 mmol/L (desirable)", "notes": "Lower targets if high risk"},
        {"test": "HDL-C", "range": ">= 1.0 mmol/L (men); >= 1.2 mmol/L (women)", "notes": ""},
        {"test": "Triglycerides", "range": "< 1.7 mmol/L", "notes": ""},
        {"test": "Non-HDL-C", "range": "< 4.0 mmol/L (desirable)", "notes": ""},
    ],

    "Coagulation": [
        {"test": "INR (no anticoagulant)", "range": "0.8–1.2", "notes": ""},
        {"test": "APTT", "range": "~ 26–38 s", "notes": "Assay specific"},
        {"test": "PT", "range": "~ 11–14 s", "notes": "Assay specific"},
        {"test": "Fibrinogen", "range": "1.8–3.5 g/L", "notes": ""},
        {"test": "D-dimer", "range": "< 0.5 mg/L FEU (500 ng/mL)", "notes": "Age-adjusted cut-offs often used"},
    ],

    "Arterial Blood Gas (21% O2)": [
        {"test": "pH", "range": "7.35–7.45", "notes": ""},
        {"test": "PaCO2", "range": "4.7–6.0 kPa", "notes": "35–45 mmHg"},
        {"test": "PaO2", "range": "10.0–13.0 kPa", "notes": "75–100 mmHg; altitude dependent"},
        {"test": "HCO3-", "range": "22–26 mmol/L", "notes": ""},
        {"test": "Base excess", "range": "−2 to +2 mmol/L", "notes": ""},
        {"test": "Lactate", "range": "0.5–2.2 mmol/L", "notes": "Sample handling sensitive"},
        {"test": "SaO2", "range": "94–98 %", "notes": "Lower targets in COPD as per local policy"},
    ],

    "Enzymes / Tissue Damage": [
        {"test": "Creatine kinase (CK, male)", "range": "40–200 U/L", "notes": "Lab/ethnicity dependent"},
        {"test": "Creatine kinase (CK, female)", "range": "25–170 U/L", "notes": ""},
        {"test": "LDH", "range": "140–280 U/L", "notes": "Lab-specific"},
        {"test": "Amylase", "range": "28–100 U/L", "notes": "Lab-specific"},
        {"test": "Lipase", "range": "13–60 U/L", "notes": "More specific for pancreatitis"},
    ],

    "Cardiac Markers": [
        {"test": "hs-Troponin I/T", "range": "Assay-specific 99th percentile", "notes": "Sex-specific cut-offs common"},
        {"test": "BNP", "range": "Assay specific", "notes": "Interpret with age/renal function"},
        {"test": "NT-proBNP", "range": "Assay/age specific", "notes": "Rule-out thresholds vary"},
    ],

    "Endocrine / Reproductive": [
        {"test": "Cortisol (09:00)", "range": "140–690 nmol/L", "notes": "Assay specific; timing critical"},
        {"test": "Prolactin (male)", "range": "< 330 mIU/L", "notes": "Assay specific"},
        {"test": "Prolactin (female)", "range": "< 500 mIU/L", "notes": "Assay specific"},
        {"test": "Testosterone (male)", "range": "10–30 nmol/L", "notes": "Morning sample"},
        {"test": "Testosterone (female)", "range": "0.3–2.0 nmol/L", "notes": ""},
        {"test": "beta-hCG (non-pregnant)", "range": "< 5 IU/L", "notes": "Gestation-specific ranges in pregnancy"},
    ],

    "Urinalysis / Protein": [
        {"test": "Urine specific gravity", "range": "1.005–1.030", "notes": ""},
        {"test": "Urine pH", "range": "4.5–8.0", "notes": ""},
        {"test": "Albumin:Creatinine ratio (ACR, men)", "range": "< 2.5 mg/mmol", "notes": "CKD staging uses thresholds"},
        {"test": "Albumin:Creatinine ratio (ACR, women)", "range": "< 3.5 mg/mmol", "notes": ""},
        {"test": "Protein:Creatinine ratio (PCR)", "range": "< 15 mg/mmol", "notes": ""},
    ],

    "Urinalysis / Protein (CKD class)": [
        {"test": "Albumin:Creatinine category A1", "range": "< 3 mg/mmol", "notes": "Normal to mildly increased (NICE NG203)"},
        {"test": "Albumin:Creatinine category A2", "range": "3–30 mg/mmol", "notes": "Moderately increased (NICE NG203)"},
        {"test": "Albumin:Creatinine category A3", "range": "> 30 mg/mmol", "notes": "Severely increased (NICE NG203)"},
    ],

    "Cardiac Markers (rule-in/rule-out context)": [
        {"test": "NT-proBNP (HF unlikely)", "range": "< 400 ng/L", "notes": "Untreated patient; HF less likely (NICE NG106)"},
        {"test": "NT-proBNP (routine referral)", "range": "400–2000 ng/L", "notes": "Echo within 6 weeks (NICE NG106)"},
        {"test": "NT-proBNP (urgent referral)", "range": "> 2000 ng/L", "notes": "Echo within 2 weeks (NICE NG106)"},
    ],

    "Diabetes (diagnosis)": [
        {"test": "HbA1c (probable diabetes)", "range": "≥ 48 mmol/mol", "notes": "Diagnostic threshold; check NG28, assay caveats"},
        {"test": "HbA1c (increased risk)", "range": "42–47 mmol/mol", "notes": "Non-diabetic hyperglycaemia / 'pre-diabetes'"},
    ],

    "Coagulation (VTE pathways)": [
        {"test": "D-dimer (age-adjusted rule-out)", "range": "Age × 10 µg/L (FEU) if ≥50 years", "notes": "Consider age-adjusted threshold (NICE NG158); assay-specific"},
    ],

    "Oxygen targets (contextual ABG/SaO2)": [
        {"test": "Target SpO2 (most acutely unwell adults)", "range": "94–98 %", "notes": "BTS oxygen guideline"},
        {"test": "Target SpO2 (risk of hypercapnia e.g., COPD)", "range": "88–92 %", "notes": "BTS oxygen guideline; follow local policy"},
    ],
}

_kv_loaded = False
logger = logging.getLogger(__name__)

class AndroidUtils:
    @staticmethod
    def get_downloads_dir():
        """Return the standard Downloads folder path on Android (legacy external)."""
        if platform != 'android':
            return None
        if not check_permission(Permission.READ_EXTERNAL_STORAGE):
            logger.warning("Cannot access Downloads: READ_EXTERNAL_STORAGE permission denied")
            return None
        try:
            from jnius import autoclass
            Environment = autoclass('android.os.Environment')
            path = Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOWNLOADS
            ).getAbsolutePath()
            return path
        except Exception as e:
            logger.error(f"Failed to get Downloads directory: {e}")
            return None

    @staticmethod
    def get_app_storage_dir():
        """Return the app-specific external storage path."""
        if platform != 'android':
            return None
        try:
            return mActivity.getExternalFilesDir(None).getAbsolutePath()
        except Exception as e:
            logger.error(f"Failed to get app storage directory: {e}")
            return None

    @staticmethod
    def schedule_gc():
        def run_gc(_dt):
            import gc
            gc.collect()
        Clock.schedule_once(run_gc, 2.0)


def _get_base_dir() -> str:
    """
    Returns a writable directory that is always available.

    • On Android, use the app's sandbox (user_data_dir when available, else cwd).
    • Elsewhere try ~/Downloads, then ~/Documents, then cwd.

    NOTE: This returns a path that already ends with 'MLA_Test'.
    """
    if platform == "android":
        app = App.get_running_app()
        base = app.user_data_dir if app else os.getcwd()
        return os.path.join(base, "MLA_Test")

    home = Path.home()
    for candidate in [home / "Downloads", home / "Documents", home]:
        if candidate.exists():
            return str(candidate / "MLA_Test")
    return str(Path.cwd() / "MLA_Test")


class LocalizationManager:
    def __init__(self, lang='en'):
        self.lang = lang
        self.translations: Dict[str, str] = {}
        self.load_translations()

    def get(self, key, **kwargs):
        value = self.translations.get(key, key)
        if kwargs:
            try:
                value = value.format(**kwargs)
            except Exception:
                pass
        return value

    def load_translations(self):
        base_dir = _get_base_dir()
        lang_dir = os.path.join(base_dir, 'lang')
        os.makedirs(lang_dir, exist_ok=True)
        lang_file = os.path.join(lang_dir, f'{self.lang}.json')
        default_translations = {
            "select_quiz": "Select Quiz...",
            "import_quiz": "Import Quiz...",
            "quiz_complete": "Quiz Completed!",
            "error_no_selection": "Please select an answer.",
            "no_quiz_available": "No quizzes available",
            "no_quizzes_found": "No Quizzes Found",
            "no_quiz_message": "No quiz files found.\n\nPlease use 'Import Quiz...' to add quiz files.",
            "error_loading_quiz": "Error loading quiz: {error}",
            "permission_denied": "Storage permissions are required to import quizzes.",
            "export_cancelled": "Export was cancelled.",
            "results_exported": "Results exported to:\n{path}",
            "results_saved": "Results successfully saved to selected location.\n\nA copy is also kept in the app's storage."
        }
        try:
            if not os.path.exists(lang_file):
                with open(lang_file, 'w', encoding='utf-8') as f:
                    json.dump(default_translations, f, indent=2)
            with open(lang_file, 'r', encoding='utf-8') as f:
                self.translations = json.load(f)
                if not isinstance(self.translations, dict):
                    raise ValueError("Invalid translation format")
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Invalid translation file {lang_file}: {e}")
            self.translations = default_translations
        except Exception as e:
            logger.error(f"Failed to load translations: {e}")
            self.translations = default_translations


class AnswerButton(ToggleButton):
    """Toggle with stored original option letter for logic."""
    bg_color = ListProperty(COL_BG_NEUTRAL)
    orig_letter = StringProperty("")


class PopupManager:
    _active_popups: List[Popup] = []

    @classmethod
    def track(cls, popup: Popup):
        if popup not in cls._active_popups:
            cls._active_popups.append(popup)
            popup.bind(on_dismiss=lambda instance, *args: cls._remove_popup(instance))
        Clock.schedule_once(lambda dt: cls._remove_popup(popup) if popup in cls._active_popups else None, 60)
        return popup

    @classmethod
    def _remove_popup(cls, popup: Popup):
        if popup in cls._active_popups:
            cls._active_popups.remove(popup)
            try:
                popup.dismiss()
            except Exception:
                pass

    @classmethod
    def close_all(cls):
        for popup in cls._active_popups.copy():
            try:
                popup.dismiss()
            except Exception:
                pass
        cls._active_popups.clear()

    @classmethod
    def show_error(cls, message: str):
        def show(_dt):
            popup = Popup(
                title='Error',
                content=Label(text=message),
                size_hint=(POPUP_WIDTH, POPUP_HEIGHT)
            )
            cls._active_popups.append(popup)
            popup.open()
        Clock.schedule_once(show)


class ImageViewer:
    """Manages image viewing popups with zoom and pan capabilities."""
    
    @staticmethod
    def show_image(image_path: str, alt_text: str = "Image"):
        """Display an image in a popup with zoom/pan controls."""
        from kivy.uix.image import Image
        from kivy.uix.scatter import Scatter
        from kivy.uix.anchorlayout import AnchorLayout
        from kivy.graphics.transformation import Matrix
        
        # Check if image file exists
        full_path = ImageViewer._resolve_image_path(image_path)
        if not full_path or not os.path.exists(full_path):
            PopupManager.show_error(f"Image not found: {image_path}")
            return
        
        # Create popup content
        content = BoxLayout(orientation='vertical', spacing=dp(5), padding=dp(5))
        
        # Add title
        title_label = Label(
            text=alt_text, 
            size_hint_y=None, 
            height=dp(25),
            font_size=dp(14)
        )
        content.add_widget(title_label)
        
        # Add rotation controls at the top
        rotation_layout = BoxLayout(
            size_hint_y=None, 
            height=dp(35), 
            spacing=dp(5)
        )
        
        rotate_left_btn = Button(text="Rotate L", size_hint_x=0.2, font_size=dp(12))
        rotate_right_btn = Button(text="Rotate R", size_hint_x=0.2, font_size=dp(12))
        center_btn = Button(text="Center", size_hint_x=0.2, font_size=dp(12))
        flip_h_btn = Button(text="Flip H", size_hint_x=0.2, font_size=dp(12))
        flip_v_btn = Button(text="Flip V", size_hint_x=0.2, font_size=dp(12))
        
        def rotate_left(_):
            scatter.rotation -= 90
        
        def rotate_right(_):
            scatter.rotation += 90
        
        def flip_horizontal(_):
            # Flip by scaling x by -1
            flip_matrix = Matrix()
            flip_matrix.scale(-1, 1, 1)
            scatter.apply_transform(flip_matrix, post_multiply=True)
        
        def flip_vertical(_):
            # Flip by scaling y by -1
            flip_matrix = Matrix()
            flip_matrix.scale(1, -1, 1)
            scatter.apply_transform(flip_matrix, post_multiply=True)
        
        def center_image(_):
            # Re-center the image using fit_to_viewport
            fit_to_viewport()
        
        rotate_left_btn.bind(on_release=rotate_left)
        rotate_right_btn.bind(on_release=rotate_right)
        center_btn.bind(on_release=center_image)
        flip_h_btn.bind(on_release=flip_horizontal)
        flip_v_btn.bind(on_release=flip_vertical)
        
        rotation_layout.add_widget(rotate_left_btn)
        rotation_layout.add_widget(rotate_right_btn)
        rotation_layout.add_widget(center_btn)
        rotation_layout.add_widget(flip_h_btn)
        rotation_layout.add_widget(flip_v_btn)
        content.add_widget(rotation_layout)
        
        # Create scrollable image container
        scroll = ScrollView(
            do_scroll_x=True,
            do_scroll_y=True,
            size_hint=(1, 1),
            bar_width=dp(8)
        )

        # NEW: container that centres its child
        container = AnchorLayout(
            size_hint=(None, None),
            anchor_x='center',
            anchor_y='center'
        )
        scroll.add_widget(container)

        # Create scatter widget for zoom/pan
        scatter = Scatter(
            do_rotation=True,
            do_translation=True,
            scale_min=0.3,     # was 0.2
            scale_max=8.0      # was 5.0
        )

        # Load and display image
        try:
            img = Image(source=full_path, allow_stretch=True, keep_ratio=True)

            def fit_to_viewport(*_):
                """
                Fit the image to the visible area of the scrollview (nearly full-screen),
                preserving aspect ratio. This makes images open large by default.
                """
                if not img.texture or scroll.width <= 0 or scroll.height <= 0:
                    return

                tex_w, tex_h = img.texture.size
                aspect = tex_w / tex_h if tex_h else 1.0

                # Use ~95% of the viewport; leave room for control bars already added above.
                vw = scroll.width * 0.98
                vh = scroll.height * 0.98

                if aspect > vw / vh:
                    disp_w = vw
                    disp_h = vw / aspect
                else:
                    disp_h = vh
                    disp_w = vh * aspect

                img.size_hint = (None, None)
                img.size = (disp_w, disp_h)
                scatter.size = img.size
                scatter.scale = 1.0
                scatter.rotation = 0

            def fit_to_viewport(*_):
                if not img.texture or scroll.width <= 0 or scroll.height <= 0:
                    return

                tex_w, tex_h = img.texture.size
                aspect = tex_w / tex_h if tex_h else 1.0

                vw = scroll.width * 0.98
                vh = scroll.height * 0.98

                if aspect > vw / vh:
                    disp_w = vw
                    disp_h = vw / aspect
                else:
                    disp_h = vh
                    disp_w = vh * aspect

                # set concrete sizes
                img.size_hint = (None, None)
                img.size = (disp_w, disp_h)
                scatter.size = img.size
                scatter.scale = 1.0
                scatter.rotation = 0

                # If content is smaller than viewport in BOTH axes → no scrolling; centre it.
                fits_horiz = disp_w <= scroll.width
                fits_vert  = disp_h <= scroll.height
                if fits_horiz and fits_vert:
                    scroll.do_scroll_x = False
                    scroll.do_scroll_y = False
                    # make the container exactly the viewport so AnchorLayout centres the scatter
                    container.size = (scroll.width, scroll.height)
                    scatter.center = container.center
                    # keep the scrollbars neutral
                    scroll.scroll_x = 0
                    scroll.scroll_y = 1
                else:
                    # content overflows in at least one axis → enable scrolling and centre
                    scroll.do_scroll_x = True
                    scroll.do_scroll_y = True
                    container.size = (max(scatter.width, scroll.width),
                                      max(scatter.height, scroll.height))
                    scatter.center = container.center
                    scroll.scroll_x = 0.5 if container.width  > scroll.width  else 0
                    scroll.scroll_y = 0.5 if container.height > scroll.height else 1

            # keep the scatter centred if sizes change
            container.bind(size=lambda *_: setattr(scatter, 'center', container.center))
            
            # Bind once texture is ready and when the scrollview resizes
            img.bind(texture=lambda *_: Clock.schedule_once(fit_to_viewport, 0.1))
            scroll.bind(size=lambda *_: Clock.schedule_once(fit_to_viewport, 0.1))
            
            # Additional Android-specific timing for better centering
            if platform == 'android':
                img.bind(texture=lambda *_: Clock.schedule_once(fit_to_viewport, 0.4))
                img.bind(texture=lambda *_: Clock.schedule_once(fit_to_viewport, 0.8))
                # Force immediate centering on Android
                Clock.schedule_once(lambda *_: setattr(scatter, 'center', container.center), 0.2)
            
            # ADD: bind to content size so centring re-evaluates when popup reflows
            content.bind(size=lambda *_: Clock.schedule_once(fit_to_viewport, 0))

            scatter.add_widget(img)
            container.add_widget(scatter)
            content.add_widget(scroll)
        except Exception as e:
            PopupManager.show_error(f"Failed to load image: {e}")
            return
        
        # Add control buttons
        button_layout = BoxLayout(
            size_hint_y=None, 
            height=dp(40), 
            spacing=dp(5)
        )
        
        zoom_in_btn = Button(text="Zoom In", size_hint_x=0.2, font_size=dp(12))
        zoom_out_btn = Button(text="Zoom Out", size_hint_x=0.2, font_size=dp(12))
        zoom_fit_btn = Button(text="Fit", size_hint_x=0.2, font_size=dp(12))
        reset_btn = Button(text="Reset", size_hint_x=0.2, font_size=dp(12))
        close_btn = Button(text="Close", size_hint_x=0.2, font_size=dp(12))
        
        def zoom_in(_):
            new_scale = scatter.scale * 1.5
            scatter.scale = min(new_scale, scatter.scale_max)
        
        def zoom_out(_):
            new_scale = scatter.scale / 1.5
            scatter.scale = max(new_scale, scatter.scale_min)
        
        def zoom_fit(_):
            fit_to_viewport()
        
        def reset_view(_):
            # Reset to initial size and transforms
            scatter.scale = 1.0
            scatter.rotation = 0
            
            # Reset transforms using proper Matrix object
            identity_matrix = Matrix()
            scatter.transform = identity_matrix
            
            # Use fit_to_viewport to reset size and position
            fit_to_viewport()
            
            # Additional reset for Android with delay
            if platform == 'android':
                Clock.schedule_once(lambda *_: fit_to_viewport(), 0.2)
        
        zoom_in_btn.bind(on_release=zoom_in)
        zoom_out_btn.bind(on_release=zoom_out)
        zoom_fit_btn.bind(on_release=zoom_fit)
        reset_btn.bind(on_release=reset_view)
        
        button_layout.add_widget(zoom_in_btn)
        button_layout.add_widget(zoom_out_btn)
        button_layout.add_widget(zoom_fit_btn)
        button_layout.add_widget(reset_btn)
        button_layout.add_widget(close_btn)
        content.add_widget(button_layout)
        
        # Create and show viewer (ModalView for Android, Popup for desktop)
        if platform == 'android':
            # Full-screen on Android (no title bar, maximises usable area)
            from kivy.uix.modalview import ModalView
            viewer = ModalView(size_hint=(1, 1), auto_dismiss=True)
            viewer.add_widget(content)
            close_btn.bind(on_release=viewer.dismiss)
        else:
            # Keep Popup on desktop (windowed)
            viewer = Popup(
                title=f'Image: {os.path.basename(image_path)}',
                content=content,
                size_hint=(0.98, 0.98),
                auto_dismiss=True
            )
            close_btn.bind(on_release=viewer.dismiss)
        
        PopupManager.track(viewer)
        viewer.open()
    
    @staticmethod
    def _resolve_image_path(image_path: str) -> Optional[str]:
        """Resolve the full path to an image file."""
        base_dir = _get_base_dir()
        
        # Try different possible locations
        possible_paths = [
            # First check the new consolidated MLA_images folder
            os.path.join(base_dir, "MLA", "MLA_images", image_path),
            # Then check other common locations
            os.path.join(base_dir, "quiz_images", image_path),
            os.path.join(base_dir, "images", image_path),
            os.path.join(base_dir, image_path),
            # Check if it's already a full path
            image_path
        ]
        
        for path in possible_paths:
            if os.path.exists(path) and os.path.isfile(path):
                return path
        
        return None


class StoragePermissionHandler:
    _permission_callback_pending = False
    _permission_request_time = 0

    @staticmethod
    def check_storage_permissions(callback=None):
        """
        For API < 30 (Android 10 and below) request READ_EXTERNAL_STORAGE.
        For API 30+ we use the SAF picker, so no runtime permission is needed.
        """
        if platform != 'android':
            if callback:
                callback(True)
            return True

        from jnius import autoclass
        Build = autoclass('android.os.Build$VERSION')

        current_time = time.time()
        if StoragePermissionHandler._permission_callback_pending and current_time - StoragePermissionHandler._permission_request_time < 5:
            return False

        sdk_int = Build.SDK_INT
        permissions = []
        if sdk_int < 30:
            permissions = [Permission.READ_EXTERNAL_STORAGE]

        has_permissions = all(check_permission(p) for p in permissions) if permissions else True
        if not has_permissions:
            StoragePermissionHandler._permission_callback_pending = True
            StoragePermissionHandler._permission_request_time = current_time
            request_permissions(permissions, lambda perms, results: StoragePermissionHandler._on_permission_result(perms, results, callback))
            return False

        if callback:
            callback(True)
        return True

    @staticmethod
    def _on_permission_result(permissions, results, callback):
        StoragePermissionHandler._permission_callback_pending = False
        granted = all(results)
        logger.info(f"Permission result: {permissions} -> {results} (granted={granted})")
        if not granted:
            logger.warning(f"Permission denied. Results: {dict(zip(permissions, results))}")
            Clock.schedule_once(StoragePermissionHandler.create_simple_popup, 0.1)
        if callback:
            callback(granted)

    @staticmethod
    def create_simple_popup(_dt):
        layout = BoxLayout(orientation='vertical', spacing=SPACING_DEFAULT, padding=PADDING_DEFAULT, size_hint=(1, None))
        layout.bind(minimum_height=layout.setter('height'))
        message_area = BoxLayout(orientation='vertical', size_hint_y=None, height=dp(150))
        message = Label(
            text='Please grant storage permissions in Settings > Apps > MLA Quiz > Permissions.\n\nThis is required to access quiz files in the Downloads folder on older Android versions.',
            halign='center', valign='middle', text_size=(dp(280), None)
        )
        message_area.add_widget(message)
        layout.add_widget(message_area)
        button_container = BoxLayout(size_hint_y=None, height=BUTTON_HEIGHT, padding=[0, dp(5), 0, dp(5)])

        popup = Popup(
            title='Storage Permission Required', content=layout, size_hint=(0.85, None), height=dp(280), auto_dismiss=True
        )

        settings_btn = Button(
            text="Open Settings", font_size=dp(18), size_hint=(0.5, None), height=BUTTON_HEIGHT, pos_hint={'center_x': 0.5},
            background_color=(0.2, 0.5, 0.2, 1), background_normal='', background_down='', border=(dp(5),)*4
        )
        dismiss_btn = Button(
            text="Dismiss", font_size=dp(18), size_hint=(0.5, None), height=BUTTON_HEIGHT, pos_hint={'center_x': 0.5},
            background_color=(0.8, 0.2, 0.2, 1), background_normal='', background_down='', border=(dp(5),)*4
        )

        def on_settings_button(*_args):
            if platform == 'android':
                try:
                    from jnius import autoclass
                    Intent = autoclass('android.content.Intent')
                    Settings = autoclass('android.provider.Settings')
                    Uri = autoclass('android.net.Uri')
                    PythonActivity = autoclass('org.kivy.android.PythonActivity')
                    intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                    package_name = PythonActivity.mActivity.getPackageName()
                    intent.setData(Uri.parse(f'package:{package_name}'))
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    PythonActivity.mActivity.startActivity(intent)
                except Exception as e:
                    logger.error(f"Failed to open settings: {e}")
                    PopupManager.show_error("Failed to open settings. Please navigate to Settings > Apps > MLA Quiz manually.")
            popup.dismiss()

        def on_dismiss_button(*_args):
            StoragePermissionHandler._permission_callback_pending = False
            popup.dismiss()

        settings_btn.bind(on_release=on_settings_button)
        dismiss_btn.bind(on_release=on_dismiss_button)
        button_container.add_widget(settings_btn)
        button_container.add_widget(dismiss_btn)
        layout.add_widget(button_container)
        popup.bind(on_dismiss=lambda *_: setattr(StoragePermissionHandler, '_permission_callback_pending', False))

        def adjust_popup_height(_dt2):
            if layout.height > 0:
                popup.height = min(dp(300), layout.height + dp(60))
        Clock.schedule_once(adjust_popup_height, 0.1)
        popup.open()


class QuizScore:
    def __init__(self, quiz_name="default"):
        self.quiz_name = quiz_name
        self.score = self.total = 0
        self.categories: Dict[str, Dict[str, int]] = {}
        base = _get_base_dir()
        self.results_dir = os.path.join(base, 'results')
        os.makedirs(self.results_dir, exist_ok=True)
        self.current_date = datetime.now().strftime("%Y%m%d")
        self.session = self._get_next_session()

    def _get_next_session(self) -> int:
        pat = re.compile(rf"MLA_Tests_results_{re.escape(self.quiz_name)}_{self.current_date}_(\d+)\.txt$")
        nums = [int(m.group(1)) for fn in os.listdir(self.results_dir) if (m := pat.match(fn))]
        return max(nums) + 1 if nums else 1

    def update(self, score, total, categories):
        self.score, self.total, self.categories = score, total, categories

    def print_results(self):
        if not self.total:
            return
        lines = [
            "=== Final Quiz Results ===",
            f"Quiz Name: {self.quiz_name}",
            f"Questions Attempted: {self.total}",
            f"Score: {self.score}/{self.total} ({self.score/self.total*100:.1f}%)",
        ]
        if self.categories:
            lines += ["", "Category Breakdown:", "-"*40]
            for cat, stats in self.categories.items():
                pct = (stats['correct']/stats['total']*100) if stats['total'] else 0
                lines.append(f"{cat}: {stats['correct']}/{stats['total']} ({pct:.1f}%)")
        fn = os.path.join(self.results_dir, f"MLA_Tests_results_{self.quiz_name}_{self.current_date}_{self.session}.txt")
        try:
            with open(fn, 'w', encoding='utf8') as fp:
                fp.write("\n".join(lines))
        except Exception as e:
            logger.error(f"Failed to save results: {e}")


def get_quiz_files() -> List[str]:
    base = _get_base_dir()
    quiz_dir = base
    os.makedirs(quiz_dir, exist_ok=True)

    files = [os.path.join(quiz_dir, f) for f in os.listdir(quiz_dir) if f.lower().endswith('.md')]

    if platform == 'android':
        from jnius import autoclass
        Build = autoclass('android.os.Build$VERSION')
        if Build.SDK_INT < 30 and check_permission(Permission.READ_EXTERNAL_STORAGE):
            downloads_dir = AndroidUtils.get_downloads_dir()
            if downloads_dir and os.path.exists(downloads_dir):
                try:
                    download_files = [os.path.join(downloads_dir, f)
                                      for f in os.listdir(downloads_dir)
                                      if f.lower().endswith('.md')]
                    files.extend(download_files)
                except Exception as e:
                    Logger.error(f"Error accessing Downloads folder: {str(e)}")
    else:
        home = os.path.expanduser("~")
        downloads_dir = os.path.join(home, "Downloads")
        if os.path.exists(downloads_dir) and os.path.isdir(downloads_dir):
            try:
                download_files = [os.path.join(downloads_dir, f)
                                  for f in os.listdir(downloads_dir)
                                  if f.lower().endswith('.md')]
                files.extend(download_files)
            except Exception as e:
                Logger.error(f"Error accessing Downloads folder: {str(e)}")
    return files


def _disambiguate_names(paths: List[str]) -> Dict[str, str]:
    """
    Return display_name -> full_path, appending context when basenames clash.
    Context: '(Downloads)' if path under ~/Downloads, else '(App)' for base dir.
    """
    base_dir = _get_base_dir()
    home = os.path.expanduser("~")
    downloads = os.path.join(home, "Downloads")
    by_name = {}
    for p in paths:
        nm = os.path.basename(p)
        by_name.setdefault(nm, []).append(p)

    mapping = {}
    for nm, same in by_name.items():
        if len(same) == 1:
            mapping[nm] = same[0]
        else:
            for p in same:
                ctx = "App" if p.startswith(base_dir) else ("Downloads" if p.startswith(downloads) else "External")
                mapping[f"{nm} ({ctx})"] = p
    return mapping


def _quiz_id_from_path(path: str) -> str:
    h = hashlib.md5(path.encode('utf-8')).hexdigest()[:10]
    return h


def _session_file_for_quiz(path: str) -> str:
    base = _get_base_dir()
    pref = os.path.join(base, 'preferences')
    os.makedirs(pref, exist_ok=True)
    return os.path.join(pref, f"session_{_quiz_id_from_path(path)}.json")


class QuizLoader:
    _active_threads: List[threading.Thread] = []
    _cache_dir = os.path.join(_get_base_dir(), 'cache')

    SPECIALTY_RE = re.compile(r'^(## Specialty:\s*.+?)(?=\n## Specialty:|\Z)', flags=re.MULTILINE | re.DOTALL)
    SPECIALTY_HEADER_RE = re.compile(r'^##\s*Specialty:\s*(.+?)\s*$', re.MULTILINE)
    QUESTION_RE = re.compile(r'(###\s*\d+\.\s*.+?)(?=\n###\s*\d+\.|\Z)', re.DOTALL)
    QUESTION_HEADER_RE = re.compile(r'###\s*(\d+)\.\s*(.*?)\n(.*)', re.DOTALL)
    SPECIALTY_IN_QUESTION_RE = re.compile(r'(?:\*\*Specialty\*\*|## Specialty):\s*(.*?)(?=\n|$)', re.IGNORECASE)

    @classmethod
    def init(cls):
        os.makedirs(cls._cache_dir, exist_ok=True)

    @staticmethod
    def _get_file_hash_and_content(path: str) -> tuple[str, str]:
        """Read file once, compute md5, and build normalized UTF-8 text."""
        try:
            import hashlib, codecs
            hasher = hashlib.md5()
            decoder = codecs.getincrementaldecoder('utf-8')('ignore')
            parts = []

            with open(path, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b''):
                    hasher.update(chunk)
                    parts.append(decoder.decode(chunk))

            parts.append(decoder.decode(b'', final=True))
            text = ''.join(parts).replace('\r\n', '\n').replace('\r', '\n').strip()
            return hasher.hexdigest(), text
        except Exception as e:
            logger.error(f"Failed to read/hash file {path}: {e}")
            return "", ""    @staticmethod
    def _load_from_cache(path, file_hash):
        cache_path = os.path.join(QuizLoader._cache_dir, f"{file_hash}.json")
        if os.path.exists(cache_path):
            try:
                with open(cache_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load cache for {path}: {e}")
        return None

    @staticmethod
    def _save_to_cache_async(path, file_hash, qs):
        def save():
            cache_path = os.path.join(QuizLoader._cache_dir, f"{file_hash}.json")
            try:
                with open(cache_path, 'w', encoding='utf-8') as f:
                    json.dump(qs, f)
            except Exception as e:
                logger.error(f"Failed to save cache for {path}: {e}")
        threading.Thread(target=save, daemon=True).start()

    @staticmethod
    def _cleanup_thread():
        QuizLoader._active_threads = [t for t in QuizLoader._active_threads if t.is_alive()]

    @staticmethod
    def analyze_investigation_variations(content):
        """Analyze and report all Investigation section variations found in content."""
        variations = {}
        total_count = 0
        
        # Pattern to find all Investigation/Investigations sections with flexible formatting
        # This captures: **Investigation(s)?**: or **Investigation(s)?:**
        pattern = r'\*\*Investigations?(?::\*\*|\*\*:)\s*'
        
        matches = re.finditer(pattern, content, re.IGNORECASE)
        for match in matches:
            variation = match.group(0)
            variations[variation] = variations.get(variation, 0) + 1
            total_count += 1
        
        # Print analysis results
        print(f"\n=== INVESTIGATION SECTION ANALYSIS ===")
        print(f"Total Investigation sections found: {total_count}")
        print(f"Number of different variations: {len(variations)}")
        print("\nVariations found:")
        for var, count in sorted(variations.items(), key=lambda x: x[1], reverse=True):
            # Show visible spaces
            display_var = var.replace(' ', '·')  # Replace spaces with middle dot for visibility
            print(f"  '{display_var}': {count} occurrences")
        print("=" * 40)
        
        return variations

    @staticmethod
    def test_investigation_pattern():
        """Test function to verify the Investigation pattern regex works correctly."""
        test_cases = [
            "**Investigations:**",
            "**Investigation:**", 
            "**Investigations**:",
            "**Investigation**:",
            "**Investigations**:  ",
            "**Investigation**:   ",
            "**investigations:**",
            "**INVESTIGATIONS:**"
        ]
        
        pattern = r'\*\*Investigations?(?::\*\*|\*\*:)\s*'
        
        print("\n=== TESTING INVESTIGATION PATTERN ===")
        for test in test_cases:
            match = re.search(pattern, test, re.IGNORECASE)
            result = "✓ MATCH" if match else "✗ NO MATCH"
            print(f"{result}: '{test}'")
        print("=" * 40)

    @staticmethod
    def _parse_question(block, specialty):
        """Parse a markdown question block into a dict (robust)."""
        if not block or not block.strip().startswith('###'):
            return None

        m = re.match(r'###\s*(\d+)\.\s*(.*?)\n(.*)', block, re.DOTALL)
        if not m:
            return None

        num, title, rest = m.groups()
        parts = [p.strip() for p in re.split(r'\n\s*\n', rest, maxsplit=4) if p.strip()]

        scenario = parts[0] if parts else ""
        investigation_index = None

        for i, part in enumerate(parts):
            # Enhanced regex to handle all Investigation section variations found:
            # 1. **Investigations:** (standard format)
            # 2. **Investigation:** (without s)  
            # 3. **Investigations**: (missing colon before closing **)
            # 4. **Investigation**: (missing s and colon before closing **)
            # 5. Optional trailing spaces after colon
            investigation_pattern = r'\*\*Investigations?(?::\*\*|\*\*:)\s*'
            investigation_match = re.search(investigation_pattern, part, re.IGNORECASE)
            
            if investigation_match:
                investigation_index = i
                # Log the variation found for debugging
                found_pattern = investigation_match.group(0)
                print(f"DEBUG: Found investigation pattern: '{found_pattern}' in question {num}")
                
                # Replace with standardized format
                parts[i] = re.sub(investigation_pattern, '[color=FFB366][b]Investigations[/b][/color]: ', parts[i], flags=re.IGNORECASE)
                break

        prompt = "What is the most likely diagnosis?"
        tail_start = 1

        if investigation_index is not None:
            scenario = scenario + '\n\n' + f"[color=FFB366]{parts[investigation_index]}[/color]"
            if investigation_index + 1 < len(parts):
                prompt = parts[investigation_index + 1]
                tail_start = investigation_index + 2
            else:
                scenario_parts_check = scenario.split('\n\n')
                if len(scenario_parts_check) > 1:
                    prompt = scenario_parts_check[-1]
                    scenario = '\n\n'.join(scenario_parts_check[:-1])
        elif len(parts) >= 2:
            prompt = parts[1]
            tail_start = 2

        if len(parts) > tail_start:
            tail = '\n\n'.join(parts[tail_start:])
        elif len(parts) == tail_start and tail_start > 0:
            tail = parts[tail_start-1] if parts[tail_start-1] not in (prompt, scenario) else ""
        elif len(parts) == 1 and investigation_index is None:
            tail = scenario
        else:
            tail = ""

        if not tail.strip() and len(parts) > 0 and parts[-1] not in (prompt, scenario):
            if not (investigation_index is not None and investigation_index == len(parts)-1):
                tail = parts[-1]

        options = re.findall(
            r'^[ \t]*([A-Z])\.\s+(.*?)(?=\n[ \t]*[A-Z]\.|\n\s*\*\*|\n\s*$)',
            tail, re.MULTILINE | re.DOTALL
        )
        
        if len(options) < 2:
            lines = [ln.strip() for ln in tail.split('\n')]
            tmp = []
            buf_letter, buf_text = None, []
            for ln in lines:
                m = re.match(r'^([A-Z])\.\s*(.*)$', ln)
                if m:
                    if buf_letter is not None and buf_text:
                        tmp.append((buf_letter, ' '.join(buf_text).strip()))
                    buf_letter, buf_text = m.group(1), [m.group(2)]
                elif buf_letter is not None:
                    buf_text.append(ln)
            if buf_letter is not None and buf_text:
                tmp.append((buf_letter, ' '.join(buf_text).strip()))
            options = [(letter, text) for letter, text in tmp]
        
        answer_match = re.search(r'\*\*Ans(?:wer)?\*\*:\s*([A-Z])\.?', tail, re.IGNORECASE)

        explanation_match = re.search(
            r'\*\*(?:Explanation|Rationale)\*\*:\s*(.*?)(?=\n-{3,}|\n\*\*\s*End Explanation\s*\*\*|$)',
            tail,
            re.DOTALL | re.IGNORECASE
        )

        answer = answer_match.group(1).upper() if answer_match else None
        explanation = explanation_match.group(1).strip() if explanation_match else ""

        specialty_match = QuizLoader.SPECIALTY_IN_QUESTION_RE.search(block)
        specialty_val = specialty_match.group(1).strip() if specialty_match else specialty

        # Extract image references using both custom and markdown syntax
        image_refs = []
        # Custom syntax: [IMAGE: filename.jpg]
        custom_images = re.findall(r'\[IMAGE:\s*([^\]]+)\]', block, re.IGNORECASE)
        # Standard markdown: ![alt text](path/to/image.jpg)
        markdown_images = re.findall(r'!\[([^\]]*)\]\(([^)]+)\)', block)
        
        for img in custom_images:
            image_refs.append(("View Image", img.strip()))
        for alt_text, img_path in markdown_images:
            image_refs.append((alt_text or "View Image", img_path.strip()))

        return {
            "number": num,
            "title": title.strip(),
            "scenario": scenario.strip(),
            "question_prompt": prompt.strip(),
            "options": [(letter, text.strip()) for letter, text in options],
            "answer": answer,
            "explanation": explanation,
            "specialty": specialty_val or "Uncategorized",
            "images": image_refs  # New field for image references
        }

    @staticmethod
    def load_from_markdown(path: str, callback: Optional[Callable[[List[Dict[str, Any]]], None]] = None):
        """Load questions from markdown with progress feedback (background thread)."""
        def _load_in_thread():
            start_time = time.time()
            try:
                file_hash, content = QuizLoader._get_file_hash_and_content(path)
                if not content:
                    return

                # Analyze Investigation section variations in the content
                QuizLoader.analyze_investigation_variations(content)

                cached_questions = QuizLoader._load_from_cache(path, file_hash)
                if cached_questions:
                    logger.info(f"Loaded {len(cached_questions)} questions from cache in {time.time() - start_time:.2f}s")
                    if callback:
                        Clock.schedule_once(lambda dt: callback(cached_questions))
                    return

                qs: List[Dict[str, Any]] = []
                question_count = 0
                total_questions = sum(1 for _ in QuizLoader.QUESTION_RE.finditer(content))

                def create_popup(_dt):
                    popup = PopupManager.track(Popup(
                        title='Loading Quiz',
                        content=Label(text=f'Loading 0/{total_questions} questions...'),
                        size_hint=(POPUP_WIDTH, POPUP_HEIGHT),
                        auto_dismiss=False
                    ))
                    popup.open()
                    popup_holder[0] = popup
                    ready.set()
                popup_holder: List[Optional[Popup]] = [None]
                ready = threading.Event()
                Clock.schedule_once(create_popup, 0)

                ready.wait()
                loading_popup: Popup = popup_holder[0]

                specialty_markers: List[tuple[int, str]] = [(0, "Uncategorized")]
                for m in QuizLoader.SPECIALTY_HEADER_RE.finditer(content):
                    specialty_markers.append((m.start(), m.group(1).strip()))
                specialty_markers.sort(key=lambda x: x[0])

                def find_specialty(pos: int) -> str:
                    lo, hi = 0, len(specialty_markers) - 1
                    best = 0
                    while lo <= hi:
                        mid = (lo + hi) // 2
                        if specialty_markers[mid][0] <= pos:
                            best = mid
                            lo = mid + 1
                        else:
                            hi = mid - 1
                    return specialty_markers[best][1]

                for qm in QuizLoader.QUESTION_RE.finditer(content):
                    block = qm.group(1)
                    specialty = find_specialty(qm.start())
                    q = QuizLoader._parse_question(block, specialty)
                    if q:
                        qs.append(q)
                        question_count += 1
                        if question_count % 10 == 0:
                            Clock.schedule_once(
                                lambda _dt, c=question_count: setattr(loading_popup.content, 'text', f'Loading {c}/{total_questions} questions...'),
                                0
                            )

                if qs:
                    QuizLoader._save_to_cache_async(path, file_hash, qs)

                logger.info(f"Loaded {len(qs)} questions in {time.time() - start_time:.2f}s")
                if callback:
                    Clock.schedule_once(lambda dt: callback(qs))

                Clock.schedule_once(lambda _dt: setattr(loading_popup.content, 'text', f'Loaded {len(qs)} questions'), 0)
                Clock.schedule_once(lambda _dt: loading_popup.dismiss(), 0.5)

            except Exception as e:
                error_msg = str(e)
                logger.error(f"Quiz loading error: {error_msg}")
                Clock.schedule_once(lambda _dt: PopupManager.show_error(f"Error loading quiz: {error_msg}"))
            finally:
                QuizLoader._cleanup_thread()

        thread = threading.Thread(target=_load_in_thread, daemon=True)
        QuizLoader._active_threads.append(thread)
        thread.start()


KV_STRING = '''
<Label>:
    font_size: dp(app.get_running_app().root.font_size_value) if (app.get_running_app() and hasattr(app.get_running_app().root, 'font_size_value')) else dp(16)
    markup: True
    allow_copy: True
<ToggleButton>:
    font_size: dp(16)
    text_size: self.width - dp(24), None
    halign: 'left'
    valign: 'middle'
    padding: dp(16), dp(12)
    size_hint_y: None
    height: dp(48)
    group: 'opts'
    allow_no_selection: True
    canvas.after:
        Color:
            rgba: (1,1,1,0.3)
        Line:
            rounded_rectangle: (self.x, self.y, self.width, self.height, dp(6))
            width: dp(1.5)
    color: (1,1,1,1)
<AnswerButton>:
    size_hint_x: 0.9
    pos_hint: {'center_x': 0.5}
    font_size: dp(16)
    text_size: self.width - dp(24), None
    halign: 'left'
    valign: 'middle'
    padding: dp(16), dp(12)
    size_hint_y: None
    height: dp(48)
    group: 'opts'
    allow_no_selection: True
    background_normal: ''
    background_down: ''
    background_disabled_normal: ''
    background_color: 0, 0, 0, 0
    canvas.before:
        Color:
            rgba: self.bg_color
        RoundedRectangle:
            pos: self.pos
            size: self.size
            radius: [dp(8),]
    canvas.after:
        Color:
            rgba: (1,1,1,0.3)
        Line:
            rounded_rectangle: (self.x, self.y, self.width, self.height, dp(6))
            width: dp(1.5)
    color: (1,1,1,1)
    disabled_color: 1, 1, 1, 1
<Spinner>:
    text_size: self.width - dp(10), None
    halign: 'left'
    valign: 'middle'
    font_size: dp(14)
<QuizWidget>:
    orientation: 'vertical'
    spacing: dp(12)
    padding: [dp(16), dp(16), dp(16), dp(30)]
    ScrollView:
        size_hint_y: None
        height: dp(52)
        do_scroll_y: False
        bar_width: 0
        BoxLayout:
            id: top_toolbar
            size_hint_x: None
            width: max(self.minimum_width, self.parent.width) if self.parent else self.minimum_width
            height: dp(52)
            spacing: dp(6)

            # Left-center: quiz picker + import
            Spinner:
                id: quiz_spinner
                text: root.l10n.get('select_quiz')
                values: root.quiz_names
                size_hint_x: None
                width: dp(140)
                text_size: self.width - dp(20), None
                halign: 'left'
                valign: 'middle'
                font_size: dp(13)
                disabled: not root.quiz_names
                on_text: root.on_quiz_select(self.text)

            Button:
                id: import_button
                text: "Import"
                size_hint_x: None
                width: dp(60)
                font_size: dp(12)
                on_release: root.import_quiz()

            Button:
                id: restart_button
                text: "Restart"
                size_hint_x: None
                width: dp(65)
                font_size: dp(12)
                disabled: not root.quiz_names
                on_release: root.restart_quiz()

            Widget:
                size_hint_x: 1

            Button:
                text: "Lab Refs"
                size_hint_x: None
                width: dp(65)
                font_size: dp(12)
                on_release: root.show_lab_refs()

            Button:
                id: more_btn
                text: "More"
                size_hint_x: None
                width: dp(50)
                font_size: dp(12)
                on_release: root.open_overflow_panel()
    BoxLayout:
        size_hint_y: None
        height: dp(40)
        spacing: dp(12)
        Label:
            text: 'Text Size:'
            size_hint_x: 0.3
        Slider:
            id: text_size_slider
            min: 10
            max: 36
            value: root.font_size_value
            step: 1
            size_hint_x: 0.5
            on_value: root.set_text_size(self.value)
        Label:
            text: str(int(text_size_slider.value))
            size_hint_x: 0.2
    ProgressBar:
        max: root.progress_max
        value: root.progress_value
        size_hint_y: None
        height: dp(4)
        canvas.before:
            Color:
                rgba: (0.2, 0.3, 0.5, 1)
            Rectangle:
                pos: self.pos
                size: self.size
    BoxLayout:
        size_hint_y: None
        height: dp(30)
        spacing: dp(12)
        Label:
            text: root.progress_text
            halign: 'left'
            size_hint_x: .5
        Label:
            text: root.score_text
            halign: 'right'
            size_hint_x: .5
    ScrollView:
        id: question_scroll
        size_hint_y: 0.25
        do_scroll_x: False
        BoxLayout:
            id: question_container
            orientation: 'vertical'
            size_hint_y: None
            height: self.minimum_height
            padding: dp(16), dp(16)
            spacing: dp(10)
            Label:
                id: question_label
                text: root.question_text
                markup: True
                text_size: self.width - dp(20), None
                size_hint_y: None
                height: max(self.texture_size[1], dp(50))
                padding: dp(16), dp(16)
            # Image buttons will be added here dynamically
    ScrollView:
        id: options_scroll
        size_hint_y: None
        height: min(self.parent.height * 0.5, root.ids.opts_cont.height + dp(10))
        do_scroll_x: False
        GridLayout:
            id: opts_cont
            cols: 1
            size_hint_y: None
            height: self.minimum_height
            spacing: dp(5)
            padding: dp(30), dp(5)
    ScrollView:
        id: feedback_scroll
        size_hint_y: 0.2
        do_scroll_x: False
        BoxLayout:
            id: feedback_container
            orientation: 'vertical'
            size_hint_y: None
            height: self.minimum_height
            padding: dp(16), dp(16)
            Label:
                id: feedback_label
                text: root.feedback_text
                markup: True
                text_size: self.width - dp(20), None
                size_hint_y: None
                height: max(self.texture_size[1], dp(20))
                padding: dp(16), dp(16)
    BoxLayout:
        size_hint_y: None
        height: dp(64)
        spacing: dp(12)
        padding: [dp(8), dp(8), dp(8), dp(8)]
        
        Button:
            text: "<"
            size_hint_x: None
            width: dp(56)
            height: dp(56)
            disabled: not root.can_back
            font_size: dp(18)
            on_release: root.previous_question()
            background_normal: ''
            background_down: ''
            background_color: (0, 0, 0, 0)
            canvas.before:
                Color:
                    rgba: (0.3, 0.3, 0.8, 0.8) if not self.disabled else (0.2, 0.2, 0.2, 0.5)
                Ellipse:
                    pos: self.center_x - dp(24), self.center_y - dp(24)
                    size: dp(48), dp(48)
        
        Button:
            id: submit_button
            text: 'Submit'
            on_release: root.submit_answer()
            disabled: not root.can_submit
            font_size: dp(16)
            
        Button:
            text: ">"
            size_hint_x: None
            width: dp(56)
            height: dp(56)
            disabled: not root.can_next
            font_size: dp(18)
            on_release: root.next_question()
            background_normal: ''
            background_down: ''
            background_color: (0, 0, 0, 0)
            canvas.before:
                Color:
                    rgba: (0.3, 0.3, 0.8, 0.8) if not self.disabled else (0.2, 0.2, 0.2, 0.5)
                Ellipse:
                    pos: self.center_x - dp(24), self.center_y - dp(24)
                    size: dp(48), dp(48)
'''

class QuizController(EventDispatcher):
    total_answered = NumericProperty(0)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.questions: List[Dict[str, Any]] = []
        self.current_idx = 0
        self.score = 0
        self.answered_questions: Dict[Any, Dict[str, Any]] = {}
        self.shuffled_options: Dict[Any, List[tuple]] = {}
        self.category_scores: Dict[str, Dict[str, int]] = {}
        self.quiz_score: Optional[QuizScore] = None
        self.quiz_complete = False

    def load_quiz(self, questions, quiz_name, limit_questions=False, specialty_filter="All"):
        if specialty_filter != "All":
            questions = [q for q in questions if q.get('specialty') == specialty_filter]
        if limit_questions and len(questions) > 100:
            questions = random.sample(questions, 100)
        random.shuffle(questions)
        self.questions = questions
        self.quiz_score = QuizScore(quiz_name)
        self.current_idx = 0
        self.score = 0
        self.total_answered = 0
        self.answered_questions.clear()
        self.shuffled_options.clear()
        self.category_scores.clear()
        self.quiz_complete = False

    def submit_answer(self, selected_orig_letter: Optional[str]):
        q = self.questions[self.current_idx]
        qkey = self._question_key(q)
        correct_letter = q['answer']
        is_correct = (selected_orig_letter == correct_letter)

        correct_text = next((text for letter, text in q['options'] if letter == correct_letter), None)

        self.answered_questions[qkey] = {
            'selected_letter': selected_orig_letter,
            'correct': is_correct,
            'question': q,
        }
        category = q.get('specialty', 'Uncategorized')
        if category not in self.category_scores:
            self.category_scores[category] = {'total': 0, 'correct': 0}
        if is_correct:
            self.score += 1
            self.category_scores[category]['correct'] += 1
        self.total_answered += 1
        self.category_scores[category]['total'] += 1
        self.quiz_score.update(self.score, self.total_answered, self.category_scores)
        self.quiz_score.print_results()
        self.quiz_complete = len(self.answered_questions) >= len(self.questions)
        return is_correct, correct_text

    def next_question(self):
        if self.current_idx < len(self.questions) - 1:
            self.current_idx += 1
            return True
        return False

    def previous_question(self):
        if self.current_idx > 0:
            self.current_idx -= 1
            return True
        return False

    def _question_key(self, question):
        return (question['number'], question['title'])

    def get_current_question(self):
        return self.questions[self.current_idx] if self.questions and self.current_idx < len(self.questions) else None


class QuizWidget(BoxLayout):
    quiz_names = ListProperty([])
    progress_text = StringProperty('Q 0/0')
    score_text = StringProperty('Score: 0/0 (0.0%)')
    question_text = StringProperty('')
    feedback_text = StringProperty('')
    can_back = BooleanProperty(False)
    can_submit = BooleanProperty(False)
    can_next = BooleanProperty(False)
    font_size_value = NumericProperty(16)
    progress_max = NumericProperty(1)
    progress_value = NumericProperty(0)
    specialty_filter = StringProperty("All")
    limit_questions = BooleanProperty(False)
    controller = ObjectProperty(None)
    can_show_results = BooleanProperty(False)
    _pending_import = BooleanProperty(False)
    review_mode = StringProperty("All")
    _review_pool = ListProperty([])
    is_landscape = BooleanProperty(False)

    def __init__(self, **kwargs):
        self.quiz_cache_lock = threading.Lock()
        self.controller = QuizController()
        self.l10n = LocalizationManager()
        global _kv_loaded
        if not _kv_loaded:
            Builder.load_string(KV_STRING)
            _kv_loaded = True
        super().__init__(**kwargs)
        self.controller.bind(total_answered=self._update_can_show_results)
        self.quiz_cache: Dict[str, str] = {}
        self._ready_for_ui_update = False
        self._file_picker_active = False
        self._last_picker_time = 0
        self._activity_result_bound = False
        self._bound_activity_result_cb = None
        self._notes: Dict[str, str] = {}
        self._marked = set()
        self._q_start_ts = None
        self._per_q_seconds = {}
        self._clock_events: List[Any] = []
        Clock.schedule_once(self.check_permissions, 2.0)
        Clock.schedule_once(lambda dt: setattr(self, '_ready_for_ui_update', True), 0.5)
        Clock.schedule_once(lambda dt: self._load_text_size_preference(), 0.7)

    def _update_can_show_results(self, instance, value):
        self.can_show_results = bool(value)

    def restore_ui_state(self):
        if not hasattr(self, 'controller') or not self.controller:
            return
        if not self.controller.questions:
            return
        if self.controller.current_idx >= len(self.controller.questions):
            return
        try:
            self._update_ui()
            self.progress_text = f"Q {self.controller.current_idx + 1}/{len(self.controller.questions)}"
            Clock.schedule_once(self._reset_scroll_positions, 0.1)
            if self.controller.total_answered > 0:
                pct = (self.controller.score / self.controller.total_answered * 100)
                self.score_text = f"Score: {self.controller.score}/{self.controller.total_answered} ({pct:.1f}%)"
            else:
                self.score_text = "Score: 0/0 (0.0%)"
        except Exception:
            self._handle_restore_error()

    def _handle_restore_error(self):
        try:
            self.question_text = ""
            self.feedback_text = ""
            self.progress_text = "Q 0/0"
            self.score_text = "Score: 0/0 (0.0%)"
            self.can_submit = False
            self.can_next = False
            self.can_back = False
            self.can_show_results = False
            if hasattr(self.ids, 'opts_cont'):
                self.ids.opts_cont.clear_widgets()
        except Exception as e:
            logger.error(f"UI restore error: {e}")

    def cleanup(self):
        for event in self._clock_events:
            try:
                event.cancel()
            except Exception:
                pass
        self._clock_events.clear()
        self.controller.questions = []
        self.controller.answered_questions.clear()
        self.controller.shuffled_options.clear()
        self.quiz_cache.clear()
        import gc
        gc.collect()

    def set_text_size(self, size):
        self.font_size_value = size
        if hasattr(self.ids, 'question_label'):
            self.ids.question_label.font_size = dp(size)
        if hasattr(self.ids, 'feedback_label'):
            self.ids.feedback_label.font_size = dp(size)
        if hasattr(self.ids, 'opts_cont'):
            for child in self.ids.opts_cont.children:
                if isinstance(child, ToggleButton):
                    child.font_size = dp(size)
        self._save_text_size_preference(size)

    def _save_text_size_preference(self, size):
        base_dir = _get_base_dir()
        pref_dir = os.path.join(base_dir, 'preferences')
        os.makedirs(pref_dir, exist_ok=True)
        try:
            with open(os.path.join(pref_dir, 'text_size.txt'), 'w') as f:
                f.write(str(size))
        except Exception:
            pass

    def _load_text_size_preference(self):
        base_dir = _get_base_dir()
        pref_path = os.path.join(base_dir, 'preferences', 'text_size.txt')
        try:
            if os.path.exists(pref_path):
                with open(pref_path, 'r') as f:
                    size = float(f.read().strip())
                    if hasattr(self.ids, 'text_size_slider'):
                        self.ids.text_size_slider.value = size
                    self.set_text_size(size)
        except Exception:
            pass

    def toggle_question_limit(self):
        self.limit_questions = not self.limit_questions
        current_quiz = self.ids.quiz_spinner.text
        if current_quiz and current_quiz in self.quiz_cache:
            self.on_quiz_select(current_quiz)

    def show_specialty_filter(self):
        specialties = set(q.get('specialty') for q in self.controller.questions if q.get('specialty'))
        all_specialties = ["All"] + sorted(list(specialties))
        content = BoxLayout(orientation='vertical', spacing=SPACING_DEFAULT, padding=PADDING_DEFAULT)
        content.add_widget(Label(text="Select a specialty to filter questions:", size_hint_y=None, height=dp(30)))
        scroll = ScrollView(size_hint=(1, 1))
        specialty_layout = GridLayout(cols=1, spacing=dp(5), size_hint_y=None)
        specialty_layout.bind(minimum_height=specialty_layout.setter('height'))
        for specialty in all_specialties:
            btn = Button(
                text=specialty, size_hint_y=None, height=BUTTON_HEIGHT, background_normal='',
                background_color=COL_BG_NEUTRAL if specialty != self.specialty_filter else (0.2, 0.3, 0.5, 1)
            )
            btn.bind(on_release=lambda btn, sp=specialty: self.apply_specialty_filter(sp))
            specialty_layout.add_widget(btn)
        scroll.add_widget(specialty_layout)
        content.add_widget(scroll)
        popup = PopupManager.track(Popup(title='Filter by Specialty', content=content, size_hint=(POPUP_WIDTH, 0.8), auto_dismiss=True))
        for child in specialty_layout.children:
            child.bind(on_release=lambda _btn, p=popup: p.dismiss())
        popup.open()

    def open_overflow(self, caller):
        dd = DropDown(auto_dismiss=True, max_height=dp(320))
        def add_item(txt, cb, disabled=False):
            b = Button(text=txt, size_hint_y=None, height=dp(44), disabled=disabled)
            b.bind(on_release=lambda *_: (cb(), dd.dismiss()))
            dd.add_widget(b)

        add_item(('100 Q' if not self.limit_questions else 'All Q'), self.toggle_question_limit)
        add_item(f"Filter ({self.specialty_filter})", self.show_specialty_filter, disabled=not self.quiz_names)
        add_item('Review Mode', self.show_review_modes, disabled=not self.quiz_names)
        add_item('Jump', self.show_jump_list, disabled=not self.quiz_names)
        add_item('Mark/Unmark', self.toggle_mark_current, disabled=not self.quiz_names)
        add_item('Note', self.edit_note_for_current, disabled=not self.quiz_names)
        add_item('Reset Progress', self.reset_progress, disabled=not self.quiz_names)
        add_item('Results', self.show_results, disabled=not self.can_show_results)

        dd.open(caller)

    def open_overflow_panel(self):
        panel = ModalView(size_hint=(0.9, 0.6), auto_dismiss=True)
        root = BoxLayout(orientation='vertical', spacing=dp(8), padding=dp(10))
        gl = GridLayout(cols=2, spacing=dp(8), size_hint_y=None)
        gl.bind(minimum_height=gl.setter('height'))

        def add_btn(txt, cb, disabled=False):
            b = Button(text=txt, size_hint_y=None, height=dp(44), disabled=disabled)
            b.bind(on_release=lambda *_: (cb(), panel.dismiss()))
            gl.add_widget(b)

        add_btn(('100 Q' if not self.limit_questions else 'All Q'), self.toggle_question_limit)
        add_btn(f"Filter ({self.specialty_filter})", self.show_specialty_filter, disabled=not self.quiz_names)
        add_btn('Review Mode', self.show_review_modes, disabled=not self.quiz_names)
        add_btn('Jump', self.show_jump_list, disabled=not self.quiz_names)
        add_btn('Mark/Unmark', self.toggle_mark_current, disabled=not self.quiz_names)
        add_btn('Note', self.edit_note_for_current, disabled=not self.quiz_names)
        add_btn('Reset Progress', self.reset_progress, disabled=not self.quiz_names)
        add_btn('Results', self.show_results, disabled=not self.can_show_results)

        scroll = ScrollView(do_scroll_x=False, do_scroll_y=True, size_hint=(1,1), bar_width=dp(3))
        scroll.add_widget(gl)
        root.add_widget(scroll)
        
        close_bar = BoxLayout(size_hint_y=None, height=dp(40))
        close_bar.add_widget(Button(text='Close', on_release=lambda *_: panel.dismiss()))
        root.add_widget(close_bar)
        panel.add_widget(root)
        panel.open()

    def _rebuild_review_pool(self):
        """Build the pool of indexes based on current review_mode."""
        mode = self.review_mode
        self._review_pool = []
        if not self.controller.questions:
            return
        if mode == "All":
            self._review_pool = list(range(len(self.controller.questions)))
            return

        for idx, q in enumerate(self.controller.questions):
            key = self.controller._question_key(q)
            ans = self.controller.answered_questions.get(key)
            if mode == "Unanswered" and not ans:
                self._review_pool.append(idx)
            elif mode == "Incorrect" and ans and not ans.get('correct'):
                self._review_pool.append(idx)
            elif mode == "Correct" and ans and ans.get('correct'):
                self._review_pool.append(idx)
            elif mode == "Marked" and key in self._marked:
                self._review_pool.append(idx)

    def show_review_modes(self):
        btn_popup = None
        content = BoxLayout(orientation='vertical', spacing=SPACING_DEFAULT, padding=PADDING_DEFAULT)
        content.add_widget(Label(text="Review mode:", size_hint_y=None, height=dp(30)))
        opts = ["All", "Unanswered", "Incorrect", "Correct", "Marked"]
        grid = GridLayout(cols=1, spacing=dp(6), size_hint_y=None)
        grid.bind(minimum_height=grid.setter('height'))
        for m in opts:
            b = Button(text=m, size_hint_y=None, height=BUTTON_HEIGHT)
            def _apply(btn, mode=m):
                self.review_mode = mode
                self._rebuild_review_pool()
                if self._review_pool:
                    self.controller.current_idx = self._review_pool[0]
                    self._update_ui()
                btn_popup.dismiss()
            b.bind(on_release=_apply)
            grid.add_widget(b)
        sv = ScrollView(); sv.add_widget(grid)
        content.add_widget(sv)
        btn_popup = PopupManager.track(Popup(title="Review Mode", content=content, size_hint=(POPUP_WIDTH, 0.6)))
        btn_popup.open()

    def show_jump_list(self):
        if not self.controller.questions:
            return
        content = BoxLayout(orientation='vertical', spacing=SPACING_DEFAULT, padding=PADDING_DEFAULT)
        info = Label(text="Tap a question to jump.", size_hint_y=None, height=dp(24))
        content.add_widget(info)

        gl = GridLayout(cols=5, spacing=dp(6), size_hint_y=None)
        gl.bind(minimum_height=gl.setter('height'))

        for idx, q in enumerate(self.controller.questions):
            key = self.controller._question_key(q)
            ans = self.controller.answered_questions.get(key)
            if ans is None:
                col = (0.25, 0.25, 0.25, 1)
            elif ans.get('correct'):
                col = (0.2, 0.5, 0.2, 1)
            else:
                col = (0.5, 0.2, 0.2, 1)

            txt = f"{idx+1}"
            if key in self._marked:
                txt += "★"

            b = Button(
                text=txt,
                size_hint_y=None, height=BUTTON_HEIGHT,
                background_normal='', background_color=col
            )
            def _jump(btn, i=idx):
                self.controller.current_idx = i
                self._update_ui()
                p.dismiss()
            b.bind(on_release=_jump)
            gl.add_widget(b)

        sv = ScrollView(); sv.add_widget(gl)
        content.add_widget(sv)
        p = PopupManager.track(Popup(title="Jump to Question", content=content, size_hint=(0.9, 0.8)))
        p.open()

    def _current_key(self):
        q = self.controller.get_current_question()
        return self.controller._question_key(q) if q else None

    def toggle_mark_current(self):
        k = self._current_key()
        if not k:
            return
        if k in self._marked:
            self._marked.remove(k)
            PopupManager.show_error("Unmarked.")
        else:
            self._marked.add(k)
            PopupManager.show_error("Marked.")
        with self.quiz_cache_lock:
            quiz_path = self.quiz_cache.get(self.ids.quiz_spinner.text)
        if quiz_path:
            self._save_session(quiz_path)

    def _start_timing_current_question(self):
        """Start timing the current question."""
        import time
        self._q_start_ts = time.time()

    def _end_timing_current_question(self):
        """End timing for the current question and accumulate time."""
        if self._q_start_ts is None:
            return
        
        import time
        elapsed = time.time() - self._q_start_ts
        self._q_start_ts = None
        
        q = self.controller.get_current_question()
        if q:
            key = self.controller._question_key(q)
            self._per_q_seconds[key] = self._per_q_seconds.get(key, 0) + elapsed

    def _flush_timer_now(self):
        """Flush current timing without ending the timer."""
        if self._q_start_ts is not None:
            import time
            q = self.controller.get_current_question()
            if q:
                key = self.controller._question_key(q)
                elapsed = time.time() - self._q_start_ts
                self._per_q_seconds[key] = self._per_q_seconds.get(key, 0) + elapsed
                self._q_start_ts = time.time()

    def reset_progress(self):
        """Reset all progress with confirmation dialog."""
        content = BoxLayout(orientation='vertical', spacing=SPACING_DEFAULT, padding=PADDING_DEFAULT)
        content.add_widget(Label(text="Reset all progress for this quiz?\n\nThis will clear:\n• All answers\n• All notes\n• All marks\n• Time tracking\n\nThis cannot be undone.", text_size=(dp(300), None), size_hint_y=None, height=dp(150)))
        
        buttons = BoxLayout(size_hint_y=None, height=BUTTON_HEIGHT, spacing=SPACING_DEFAULT)
        cancel_btn = Button(text='Cancel')
        reset_btn = Button(text='Reset All')
        
        def do_reset(_):
            self.controller.answered_questions.clear()
            self.controller.current_idx = 0
            self._notes.clear()
            self._marked.clear()
            self._per_q_seconds.clear()
            self._q_start_ts = None
            
            self.review_mode = "All"
            
            with self.quiz_cache_lock:
                quiz_path = self.quiz_cache.get(self.ids.quiz_spinner.text)
            if quiz_path:
                self._save_session(quiz_path)
            
            self._update_ui()
            self._rebuild_review_pool()
            reset_popup.dismiss()
            PopupManager.show_error("Progress reset.")
        
        reset_btn.bind(on_release=do_reset)
        cancel_btn.bind(on_release=lambda _: reset_popup.dismiss())
        
        buttons.add_widget(cancel_btn)
        buttons.add_widget(reset_btn)
        content.add_widget(buttons)
        
        reset_popup = PopupManager.track(Popup(title="Reset Progress", content=content, size_hint=(POPUP_WIDTH, 0.5)))
        reset_popup.open()

    def restart_quiz(self):
        """Restart quiz from question 1, keeping progress intact."""
        if not self.quiz_names or not self.controller.questions:
            return
            
        content = BoxLayout(orientation='vertical', spacing=dp(12), padding=dp(16))
        content.add_widget(Label(
            text="Restart from Question 1?\n\nThis will take you back to the first question but keep your progress and answers intact.",
            text_size=(dp(300), None), 
            size_hint_y=None, 
            height=dp(100)
        ))
        
        buttons = BoxLayout(size_hint_y=None, height=dp(48), spacing=dp(12))
        cancel_btn = Button(text='Cancel')
        restart_btn = Button(text='Restart')
        
        def do_restart(_):
            self.controller.current_idx = 0
            self._update_ui()
            restart_popup.dismiss()
            PopupManager.show_error("Quiz restarted from question 1.")
        
        restart_btn.bind(on_release=do_restart)
        cancel_btn.bind(on_release=lambda _: restart_popup.dismiss())
        
        buttons.add_widget(cancel_btn)
        buttons.add_widget(restart_btn)
        content.add_widget(buttons)
        
        restart_popup = PopupManager.track(Popup(title="Restart Quiz", content=content, size_hint=(POPUP_WIDTH, 0.4)))
        restart_popup.open()

    def edit_note_for_current(self):
        q = self.controller.get_current_question()
        if not q:
            return
        key = str(list(self.controller._question_key(q)))
        box = BoxLayout(orientation='vertical', spacing=SPACING_DEFAULT, padding=PADDING_DEFAULT)
        ti = TextInput(text=self._notes.get(key, ""), multiline=True, size_hint_y=None, height=dp(160))
        box.add_widget(ti)
        btns = BoxLayout(size_hint_y=None, height=BUTTON_HEIGHT, spacing=SPACING_DEFAULT)
        save_b = Button(text="Save"); cancel_b = Button(text="Cancel")
        btns.add_widget(save_b); btns.add_widget(cancel_b)
        box.add_widget(btns)
        p = PopupManager.track(Popup(title="Note", content=box, size_hint=(0.9, 0.6)))

        def _save(_btn):
            self._notes[key] = ti.text.strip()
            with self.quiz_cache_lock:
                quiz_path = self.quiz_cache.get(self.ids.quiz_spinner.text)
            if quiz_path:
                self._save_session(quiz_path)
            p.dismiss()

        save_b.bind(on_release=_save)
        cancel_b.bind(on_release=p.dismiss)
        p.open()

    def show_lab_refs(self):
        """Show lab reference ranges popup with search functionality"""
        panel = ModalView(size_hint=(0.95, 0.85), auto_dismiss=True)
        root = BoxLayout(orientation='vertical', spacing=dp(8), padding=dp(10))

        header = Label(
            text="[b]Reference ranges vary by laboratory, assay, age, sex and pregnancy.[/b]\n"
                 "Verify against your local NHS lab report.",
            markup=True, size_hint_y=None
        )
        header.bind(texture_size=lambda inst, sz: setattr(inst, 'height', sz[1]))
        root.add_widget(header)

        search_box = BoxLayout(size_hint_y=None, height=dp(40), spacing=dp(8))
        ti = TextInput(hint_text="Filter by test (e.g. 'potassium', 'TSH')", multiline=False)
        clear_btn = Button(text="Clear", size_hint_x=None, width=dp(80))
        search_box.add_widget(ti)
        search_box.add_widget(clear_btn)
        root.add_widget(search_box)

        sv = ScrollView(do_scroll_x=False, do_scroll_y=True, bar_width=dp(3))
        table = GridLayout(cols=1, spacing=dp(6), size_hint_y=None, padding=[0, dp(4), 0, dp(10)])
        table.bind(minimum_height=table.setter('height'))
        sv.add_widget(table)
        root.add_widget(sv)

        footer = BoxLayout(size_hint_y=None, height=dp(44), spacing=dp(8))
        copy_btn = Button(text="Copy CSV")
        close_btn = Button(text="Close")
        footer.add_widget(copy_btn)
        footer.add_widget(close_btn)
        root.add_widget(footer)

        def row_widget(txt, bold=False, bg=None):
            from kivy.graphics import Color, RoundedRectangle
            bx = BoxLayout(orientation='horizontal', size_hint_y=None, height=dp(36), padding=[dp(6), 0, dp(6), 0], spacing=dp(8))
            if bg:
                with bx.canvas.before:
                    Color(*bg)
                    bx._bg_rect = RoundedRectangle(pos=bx.pos, size=bx.size, radius=[dp(6),])
                bx.bind(pos=lambda w, v: setattr(bx._bg_rect, 'pos', v),
                        size=lambda w, v: setattr(bx._bg_rect, 'size', v))
            lbl = Label(text=txt, markup=True, halign='left', valign='middle')
            lbl.bind(texture_size=lambda inst, sz: setattr(bx, 'height', max(dp(36), sz[1] + dp(10))))
            bx.add_widget(lbl)
            return bx

        def section_header(title):
            return row_widget(f"[b]{title}[/b]", bold=True, bg=(0.18, 0.18, 0.22, 1))

        def format_item(it):
            notes = f" — {it['notes']}" if it.get('notes') else ""
            return f"[b]{it['test']}[/b]: {it['range']}{notes}"

        def rebuild():
            table.clear_widgets()
            query = ti.text.strip().lower()
            for section, items in LAB_RANGES.items():
                filtered = [it for it in items if (not query or query in it['test'].lower())]
                if not filtered:
                    continue
                table.add_widget(section_header(section))
                for it in filtered:
                    table.add_widget(row_widget(format_item(it)))

        def to_csv():
            out = ["Section,Test,Range,Notes"]
            for section, items in LAB_RANGES.items():
                for it in items:
                    if ti.text and ti.text.strip().lower() not in it['test'].lower():
                        continue
                    s = section.replace(",", " ")
                    t = it['test'].replace(",", " ")
                    r = it['range'].replace(",", " ")
                    n = (it.get('notes') or "").replace(",", " ")
                    out.append(f"{s},{t},{r},{n}")
            return "\n".join(out)

        ti.bind(text=lambda *_: rebuild())
        clear_btn.bind(on_release=lambda *_: setattr(ti, 'text', ""))
        copy_btn.bind(on_release=lambda *_: Clipboard.copy(to_csv()))
        close_btn.bind(on_release=lambda *_: panel.dismiss())

        rebuild()
        panel.add_widget(root)
        panel.open()

    def apply_specialty_filter(self, specialty):
        self.specialty_filter = specialty
        current_quiz = self.ids.quiz_spinner.text
        if current_quiz and current_quiz in self.quiz_cache:
            self.on_quiz_select(current_quiz)

    def on_quiz_select(self, quiz_name):
        with self.quiz_cache_lock:
            if not quiz_name or quiz_name not in self.quiz_cache:
                return
            path = self.quiz_cache[quiz_name]
        self.feedback_text = ''
        loading_popup = PopupManager.track(Popup(
            title='Loading Quiz', content=Label(text=f'Loading {quiz_name}...'), size_hint=(POPUP_WIDTH, POPUP_HEIGHT), auto_dismiss=False
        ))
        loading_popup.open()

        def quiz_loaded(questions):
            loading_popup.content.text = f"Loaded {len(questions)} questions"
            Clock.schedule_once(lambda dt: loading_popup.dismiss(), 0.5)
            if not questions:
                Popup(title='Error', content=Label(text=f'Failed to load quiz or no valid questions found in {quiz_name}'), size_hint=(POPUP_WIDTH, POPUP_HEIGHT)).open()
                return
            self.controller.load_quiz(questions, quiz_name, self.limit_questions, self.specialty_filter)
            if not self.controller.questions and self.specialty_filter != "All":
                Popup(title='No Questions Found', content=Label(text=f'No questions found for specialty: {self.specialty_filter}'), size_hint=(POPUP_WIDTH, POPUP_HEIGHT)).open()
                self.specialty_filter = "All"
                return
            
            try:
                sess_path = _session_file_for_quiz(path)
                if os.path.exists(sess_path):
                    with open(sess_path, 'r', encoding='utf-8') as fp:
                        sess = json.load(fp)
                    idx = int(sess.get('current_idx', 0))
                    idx = max(0, min(idx, len(self.controller.questions) - 1))
                    self.controller.current_idx = idx

                    answered = sess.get('answered', [])
                    by_key = {self.controller._question_key(q): q for q in self.controller.questions}
                    for row in answered:
                        key = tuple(row.get('key', []))
                        sel = row.get('selected_letter')
                        if key in by_key and sel:
                            q = by_key[key]
                            self.controller.current_idx = self.controller.questions.index(q)
                            self.controller.submit_answer(sel)

                    self.specialty_filter = sess.get('specialty_filter', self.specialty_filter)
                    self.limit_questions = bool(sess.get('limit_questions', self.limit_questions))
                    self._notes = sess.get('notes', {})
                    
                    marked_list = sess.get('marked', [])
                    self._marked = set(tuple(key) if isinstance(key, list) else key for key in marked_list)
                    
                    timing_data = sess.get('per_q_seconds', {})
                    self._per_q_seconds = {}
                    for k_str, seconds in timing_data.items():
                        try:
                            tup = tuple(json.loads(k_str))
                            self._per_q_seconds[tup] = float(seconds)
                        except Exception:
                            pass
            except Exception:
                pass
            
            self._update_ui()
            self._rebuild_review_pool()

        QuizLoader.load_from_markdown(path, quiz_loaded)

    def check_permissions(self, _dt):
        def permission_callback(granted, *args):
            if granted:
                event = Clock.schedule_once(lambda _dt2: self._load_quizzes(), 0.5)
                self._clock_events.append(event)
            else:
                Clock.schedule_once(StoragePermissionHandler.create_simple_popup, 0.1)

        StoragePermissionHandler.check_storage_permissions(permission_callback)

    def _load_quizzes(self):
        loading_popup = PopupManager.track(Popup(
            title='Loading Quizzes', content=Label(text='Please wait while quizzes are loading...'), size_hint=(POPUP_WIDTH, POPUP_HEIGHT), auto_dismiss=False
        ))
        loading_popup.open()

        def _load_in_background():
            paths = get_quiz_files()
            name_to_path = _disambiguate_names(paths)
            names = sorted(name_to_path.keys())
            quiz_cache = name_to_path
            Clock.schedule_once(lambda _dt: self._finalize_quiz_loading(names, quiz_cache, loading_popup), 0)

        thread = threading.Thread(target=_load_in_background, daemon=True)
        thread.start()

    def _finalize_quiz_loading(self, names, quiz_cache, loading_popup):
        with self.quiz_cache_lock:
            self.quiz_cache = quiz_cache
            self.quiz_names = names
        loading_popup.dismiss()
        if names:
            self.ids.quiz_spinner.text = names[0]
            self.on_quiz_select(names[0])
        else:
            Popup(
                title=self.l10n.get('no_quizzes_found'),
                content=Label(text=self.l10n.get('no_quiz_message')),
                size_hint=(POPUP_WIDTH, POPUP_HEIGHT)
            ).open()

    def import_quiz(self):
        if self._pending_import:
            return
        self._pending_import = True
        self.ids.import_button.disabled = True

        def permission_callback(granted, *args):
            self._pending_import = False
            self.ids.import_button.disabled = False
            if granted:
                if platform == 'android':
                    self._show_file_picker_android()
                else:
                    self._show_file_picker_desktop()
            else:
                PopupManager.show_error(self.l10n.get('permission_denied'))

        StoragePermissionHandler.check_storage_permissions(permission_callback)

    def _show_file_picker_desktop(self):
        try:
            filechooser.open_file(
                title="Select Quiz Files, Images, or ZIP Packages",
                filters=["*.md", "*.zip", "*.jpg", "*.jpeg", "*.png", "*.gif", "*.bmp", "*.webp", "*.svg"],
                multiple=True,
                on_selection=self._on_import_selection_desktop
            )
        except Exception as e:
            PopupManager.show_error(f'File chooser error: {str(e)}')

    def _on_import_selection_desktop(self, selection):
        if not selection or any(s is None for s in selection):
            Popup(title='No Selection', content=Label(text='No valid quiz files were selected.'), size_hint=(POPUP_WIDTH, POPUP_HEIGHT)).open()
            return
        processing_popup = PopupManager.track(Popup(
            title='Processing', content=Label(text='Importing files...'), size_hint=(POPUP_WIDTH, POPUP_HEIGHT), auto_dismiss=False
        ))
        processing_popup.open()

        def process_files_background():
            imported_count = 0
            image_count = 0
            zip_count = 0
            quiz_dir = _get_base_dir()
            images_dir = os.path.join(quiz_dir, "quiz_images")
            os.makedirs(quiz_dir, exist_ok=True)
            os.makedirs(images_dir, exist_ok=True)
            
            for src_path in selection:
                if not src_path or not os.path.exists(src_path):
                    continue
                    
                filename = os.path.basename(src_path)
                file_ext = os.path.splitext(filename)[1].lower()
                
                # Handle ZIP files
                if file_ext == '.zip':
                    zip_imported, zip_images = self._process_zip_file(src_path, quiz_dir, images_dir)
                    imported_count += zip_imported
                    image_count += zip_images
                    if zip_imported > 0 or zip_images > 0:
                        zip_count += 1
                
                # Handle markdown files
                elif file_ext == '.md':
                    if not filename.lower().endswith('.md'):
                        filename += '.md'
                    dest_path = os.path.join(quiz_dir, filename)
                    try:
                        with open(src_path, 'r', encoding='utf-8') as src_file:
                            content = src_file.read()
                        with open(dest_path, 'w', encoding='utf-8') as dest_file:
                            dest_file.write(content)
                        imported_count += 1
                    except Exception:
                        pass
                
                # Handle image files
                elif file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']:
                    dest_path = os.path.join(images_dir, filename)
                    try:
                        with open(src_path, 'rb') as src_file:
                            content = src_file.read()
                        with open(dest_path, 'wb') as dest_file:
                            dest_file.write(content)
                        image_count += 1
                    except Exception:
                        pass

            def update_ui(_dt):
                processing_popup.dismiss()
                total_imported = imported_count + image_count
                if total_imported > 0:
                    msg = f'Successfully imported {imported_count} quiz file(s)'
                    if image_count > 0:
                        msg += f' and {image_count} image file(s)'
                    if zip_count > 0:
                        msg += f' from {zip_count} ZIP package(s)'
                    msg += '.'
                    Popup(title='Import Successful', content=Label(text=msg), size_hint=(POPUP_WIDTH, POPUP_HEIGHT)).open()
                    event = Clock.schedule_once(lambda _dt2: self._load_quizzes(), 1.0)
                    self._clock_events.append(event)
                else:
                    Popup(title='Import Failed', content=Label(text='No quiz or image files were imported.'), size_hint=(POPUP_WIDTH, POPUP_HEIGHT)).open()

            Clock.schedule_once(update_ui, 0)

        thread = threading.Thread(target=process_files_background, daemon=True)
        thread.start()

    def _process_zip_file(self, zip_path: str, quiz_dir: str, images_dir: str) -> tuple[int, int]:
        """
        Process a ZIP file containing quiz and image files.
        Returns (quiz_count, image_count) of successfully imported files.
        """
        import zipfile
        quiz_count = 0
        image_count = 0
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                # Get list of files in the ZIP
                file_list = zip_ref.namelist()
                
                for file_path in file_list:
                    # Skip directories
                    if file_path.endswith('/'):
                        continue
                    
                    # Get just the filename (no directory structure)
                    filename = os.path.basename(file_path)
                    if not filename:  # Skip if no filename (directory path)
                        continue
                    
                    file_ext = os.path.splitext(filename)[1].lower()
                    
                    try:
                        # Extract and process markdown files
                        if file_ext == '.md':
                            content = zip_ref.read(file_path)
                            # Decode content as UTF-8
                            content_str = content.decode('utf-8', errors='ignore')
                            
                            dest_path = os.path.join(quiz_dir, filename)
                            with open(dest_path, 'w', encoding='utf-8') as f:
                                f.write(content_str)
                            quiz_count += 1
                        
                        # Extract and process image files
                        elif file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']:
                            content = zip_ref.read(file_path)
                            dest_path = os.path.join(images_dir, filename)
                            with open(dest_path, 'wb') as f:
                                f.write(content)
                            image_count += 1
                            
                    except Exception as e:
                        logger.error(f"Failed to extract {file_path} from ZIP: {e}")
                        continue
                        
        except zipfile.BadZipFile:
            PopupManager.show_error(f"Invalid ZIP file: {os.path.basename(zip_path)}")
        except Exception as e:
            logger.error(f"Failed to process ZIP file {zip_path}: {e}")
            PopupManager.show_error(f"Error processing ZIP file: {str(e)}")
        
        return quiz_count, image_count

    def _show_file_picker_android(self):
        from jnius import autoclass
        global android_activity

        if android_activity is None:
            PopupManager.show_error("Activity not available.")
            return

        try:
            if self._bound_activity_result_cb:
                android_activity.unbind(on_activity_result=self._bound_activity_result_cb)
        except Exception:
            pass
        android_activity.bind(on_activity_result=self._on_file_selected_android)
        self._bound_activity_result_cb = self._on_file_selected_android
        self._activity_result_bound = True

        Intent = autoclass('android.content.Intent')
        PythonActivity = autoclass('org.kivy.android.PythonActivity')

        intent = Intent(Intent.ACTION_GET_CONTENT)
        intent.addCategory(Intent.CATEGORY_OPENABLE)
        intent.setType("*/*")
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        PythonActivity.mActivity.startActivityForResult(intent, 12345)

    def _on_file_selected_android(self, request_code, result_code, data):
        if request_code == 12345 and result_code == -1 and data is not None:
            uri = data.getData()
            if uri:
                Clock.schedule_once(lambda _dt: self._process_selected_file_android(uri), 0)
        try:
            if self._bound_activity_result_cb:
                android_activity.unbind(on_activity_result=self._bound_activity_result_cb)
        except Exception:
            pass
        self._activity_result_bound = False
        self._bound_activity_result_cb = None

    def _process_selected_file_android(self, uri):
        from jnius import autoclass  # Android only

        popup = Popup(title='Processing', content=Label(text='Processing selected file...'), size_hint=(0.8, 0.4), auto_dismiss=False)
        popup.open()

        def process_in_background():
            input_stream = None
            filename = "imported_file"
            try:
                PythonActivity = autoclass('org.kivy.android.PythonActivity')
                cr = PythonActivity.mActivity.getContentResolver()

                cursor = cr.query(uri, None, None, None, None)
                if cursor and cursor.moveToFirst():
                    name_idx = cursor.getColumnIndex("_display_name")
                    if name_idx >= 0:
                        filename = cursor.getString(name_idx)
                if cursor:
                    cursor.close()

                # Detect file type based on extension
                file_ext = os.path.splitext(filename)[1].lower() if filename else ""
                is_zip = file_ext == '.zip'
                
                if not is_zip and not filename.lower().endswith('.md'):
                    filename += '.md'

                quiz_dir = _get_base_dir()
                images_dir = os.path.join(quiz_dir, "quiz_images")
                os.makedirs(quiz_dir, exist_ok=True)
                os.makedirs(images_dir, exist_ok=True)

                input_stream = cr.openInputStream(uri)
                
                # Read all bytes first
                String = autoclass('java.lang.String')
                ByteArrayOutputStream = autoclass('java.io.ByteArrayOutputStream')
                
                baos = ByteArrayOutputStream()
                
                try:
                    all_bytes = input_stream.readAllBytes()
                    file_bytes = bytes([b & 0xFF for b in all_bytes])
                except:
                    try:
                        input_stream.transferTo(baos)
                        file_bytes = bytes([b & 0xFF for b in baos.toByteArray()])
                    except:
                        byte_list = []
                        while True:
                            byte_val = input_stream.read()
                            if byte_val == -1:
                                break
                            byte_list.append(byte_val & 0xFF)
                        file_bytes = bytes(byte_list)

                if is_zip:
                    # Handle ZIP file
                    temp_zip_path = os.path.join(quiz_dir, 'temp_import.zip')
                    try:
                        with open(temp_zip_path, 'wb') as f:
                            f.write(file_bytes)
                        
                        quiz_count, image_count = self._process_zip_file(temp_zip_path, quiz_dir, images_dir)
                        os.remove(temp_zip_path)  # Clean up temp file
                        
                        if quiz_count > 0 or image_count > 0:
                            success_msg = f'Successfully imported {quiz_count} quiz file(s)'
                            if image_count > 0:
                                success_msg += f' and {image_count} image file(s)'
                            success_msg += ' from ZIP package.'
                            Clock.schedule_once(lambda _dt: self._file_import_success(success_msg, popup), 0)
                        else:
                            Clock.schedule_once(lambda _dt: self._file_import_error("No valid quiz or image files found in ZIP", popup), 0)
                    except Exception as e:
                        if os.path.exists(temp_zip_path):
                            os.remove(temp_zip_path)
                        raise e
                else:
                    # Handle markdown file
                    target_path = os.path.join(quiz_dir, filename)
                    file_content = file_bytes.decode('utf-8', errors='ignore')
                    
                    with open(target_path, 'w', encoding='utf-8') as f:
                        f.write(file_content)

                    Clock.schedule_once(lambda _dt: self._file_import_success(f'Successfully imported: {filename}', popup), 0)
                    
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Failed to process file {filename}: {error_msg}")
                Clock.schedule_once(lambda _dt: self._file_import_error(error_msg, popup), 0)
            finally:
                try:
                    if input_stream:
                        input_stream.close()
                except Exception:
                    pass

        threading.Thread(target=process_in_background, daemon=True).start()

    def _file_import_success(self, message, popup):
        popup.dismiss()
        Popup(title='Import Successful', content=Label(text=message), size_hint=(0.8, 0.4)).open()
        Clock.schedule_once(lambda _dt: self._load_quizzes(), 1.0)

    def _file_import_error(self, error_message, popup):
        popup.dismiss()
        Popup(title='File Error', content=Label(text=f'Error reading file content: {error_message}'), size_hint=(0.8, 0.4)).open()

    def _update_ui(self):
        self._end_timing_current_question()
        
        q = self.controller.get_current_question()
        if not q:
            self.question_text = "No questions available"
            self.progress_text = "Q 0/0"
            self.can_submit = False
            self.can_next = False
            self.can_back = False
            self.progress_max = 1
            self.progress_value = 0
            return

        self._start_timing_current_question()

        qkey = self.controller._question_key(q)
        self.question_text = f"{q['scenario']}\n\n[color=CCCCFF]{q['question_prompt']}[/color]"
        self._update_options(q)
        self._update_image_buttons(q)  # Add image buttons

        self.progress_text = f"Q {self.controller.current_idx + 1}/{len(self.controller.questions)}"
        self.progress_max = len(self.controller.questions)
        self.progress_value = self.controller.current_idx + 1

        missing_answer = not bool(q.get('answer'))
        if missing_answer:
            self.feedback_text = "[color=CC3333][b]This question is missing an answer key and is not scorable.[/b][/color]"

        self.can_submit = (qkey not in self.controller.answered_questions) and (not missing_answer)
        self.can_back = self.controller.current_idx > 0
        self.can_next = self.controller.current_idx < len(self.controller.questions) - 1

        if qkey not in self.controller.answered_questions:
            if not missing_answer:
                self.feedback_text = ""
        else:
            self._show_answer_feedback()

        self.controller.quiz_complete = len(self.controller.answered_questions) >= len(self.controller.questions)
        pct = (self.controller.score / self.controller.total_answered * 100) if self.controller.total_answered > 0 else 0
        self.score_text = f"Score: {self.controller.score}/{self.controller.total_answered} ({pct:.1f}%)"

        event = Clock.schedule_once(lambda _dt: self._reset_scroll_positions(), 0.1)
        self._clock_events.append(event)

    def _reset_scroll_positions(self, _dt=0):
        for sv in [self.ids.question_scroll, self.ids.options_scroll, self.ids.feedback_scroll]:
            sv.scroll_y = 1.0
            if sv.children:
                if hasattr(sv.children[0], 'do_layout'):
                    sv.children[0].do_layout()

    def _update_options(self, question):
        if not hasattr(self.ids, 'opts_cont'):
            return

        if not question.get('options'):
            self.can_submit = False
            self.feedback_text = "[color=CC3333][b]This item has no options parsed.[/b][/color]"
            return

        qkey = self.controller._question_key(question)
        unique_group = f"opts_{abs(hash(qkey))}"
        
        if qkey not in self.controller.shuffled_options:
            original_options = list(question['options'])
            shuffled_indices = list(range(len(original_options)))
            random.shuffle(shuffled_indices)
            shuffled_options = []
            for i, shuffle_idx in enumerate(shuffled_indices):
                orig_letter, text = original_options[shuffle_idx]
                shuffled_options.append((chr(65 + i), text, orig_letter))
            self.controller.shuffled_options[qkey] = shuffled_options
        else:
            shuffled_options = self.controller.shuffled_options[qkey]

        self.ids.opts_cont.clear_widgets()
        answered = qkey in self.controller.answered_questions
        selected_letter = self.controller.answered_questions[qkey]['selected_letter'] if answered else None
        correct_letter = question['answer']

        for disp_letter, text, orig_letter in shuffled_options:
            if answered:
                if orig_letter == correct_letter:
                    bg_color = COL_BG_CORRECT
                elif selected_letter == orig_letter:
                    bg_color = COL_BG_INCORRECT
                else:
                    bg_color = COL_BG_NEUTRAL
            else:
                bg_color = COL_BG_NEUTRAL

            btn = AnswerButton(
                text=f"{disp_letter}. {text}",
                bg_color=bg_color,
                disabled=answered,
            )
            btn.orig_letter = orig_letter
            btn.group = unique_group

            if answered and selected_letter == orig_letter:
                btn.state = 'down'

            if not answered:
                def update_button_color(button, state):
                    button.bg_color = (0.15, 0.4, 0.7, 1) if state == 'down' else COL_BG_NEUTRAL
                btn.bind(state=update_button_color)

            self.ids.opts_cont.add_widget(btn)

    def _update_image_buttons(self, question):
        """Add image view buttons to the question area if images are referenced."""
        if not hasattr(self.ids, 'question_container'):
            return
        
        # Remove any existing image buttons (they'll have a specific tag)
        container = self.ids.question_container
        children_to_remove = []
        for child in container.children:
            if hasattr(child, '_is_image_button'):
                children_to_remove.append(child)
        
        for child in children_to_remove:
            container.remove_widget(child)
        
        # Add new image buttons if images are present
        images = question.get('images', [])
        if not images:
            return
        
        # Create a horizontal layout for image buttons
        button_layout = BoxLayout(
            orientation='horizontal',
            size_hint_y=None,
            height=dp(50),
            spacing=dp(10)
        )
        button_layout._is_image_button = True  # Tag for easy removal
        
        for alt_text, image_path in images:
            btn = Button(
                text=alt_text,
                size_hint_x=None,
                width=dp(150),
                height=dp(40),
                font_size=dp(14),
                background_color=(0.2, 0.6, 0.8, 1)
            )
            
            # Create closure to capture image_path and alt_text
            def create_image_handler(img_path, img_alt):
                return lambda _: ImageViewer.show_image(img_path, img_alt)
            
            btn.bind(on_release=create_image_handler(image_path, alt_text))
            button_layout.add_widget(btn)
        
        # Add some spacing
        button_layout.add_widget(Widget())  # Spacer
        
        # Insert the button layout after the question label
        container.add_widget(button_layout, index=len(container.children)-1)

    def _show_answer_feedback(self):
        q = self.controller.get_current_question()
        qkey = self.controller._question_key(q)
        if qkey not in self.controller.answered_questions:
            return
        answer_data = self.controller.answered_questions[qkey]
        selected_letter = answer_data['selected_letter']
        correct = answer_data['correct']
        correct_letter = q['answer']
        correct_text = next((text for letter, text in q['options'] if letter == correct_letter), None)
        title_line = f"[color=CCCCFF][b]{q['title']}[/b][/color]\n"
        specialty_line = f"[color=CCCCFF][b]{q['specialty']}[/b][/color]"
        self.feedback_text = (
            f"{specialty_line}: {title_line}"
            f"[color=33CC33][b]Correct![/b][/color] [b]{correct_text}[/b].\n[b]Explanation:[/b]\n{q['explanation']}"
            if correct else
            f"{specialty_line}: {title_line}"
            f"[b][color=CC3333]Incorrect.[/color][/b] The answer is: [b]{correct_text}[/b].\n[b]Explanation:[/b]\n{q['explanation']}"
        )

    def submit_answer(self):
        q = self.controller.get_current_question()
        if not q or not q.get('answer'):
            PopupManager.show_error("This question has no answer key. Use Next to continue.")
            return
            
        selected_orig_letter = None
        for child in self.ids.opts_cont.children:
            if isinstance(child, ToggleButton) and child.state == 'down' and hasattr(child, 'orig_letter'):
                selected_orig_letter = child.orig_letter
                break
        if not selected_orig_letter:
            PopupManager.show_error(self.l10n.get('error_no_selection'))
            return
        _is_correct, _correct_text = self.controller.submit_answer(selected_orig_letter)
        self._update_ui()
        
        with self.quiz_cache_lock:
            quiz_path = self.quiz_cache.get(self.ids.quiz_spinner.text)
        if quiz_path:
            self._save_session(quiz_path)
        
        self._rebuild_review_pool()
            
        if self.controller.quiz_complete:
            event = Clock.schedule_once(lambda _dt: self._show_completion_popup(), 1.0)
            self._clock_events.append(event)

    def _show_completion_popup(self):
        qlen = len(self.controller.questions)
        pct = (self.controller.score / qlen * 100) if qlen else 0
        content = BoxLayout(orientation='vertical', padding=PADDING_DEFAULT, spacing=SPACING_DEFAULT)
        content.add_widget(Label(
            text=f"{self.l10n.get('quiz_complete')}\n\nScore: {self.controller.score}/{qlen} ({pct:.1f}%)\n\nResults have been saved to your device.",
            halign='center'
        ))
        buttons = BoxLayout(size_hint_y=None, height=BUTTON_HEIGHT, spacing=SPACING_DEFAULT)
        show_results_btn = Button(text='Show Results')
        close_btn = Button(text='Close')
        buttons.add_widget(show_results_btn)
        buttons.add_widget(close_btn)
        content.add_widget(buttons)
        popup = PopupManager.track(Popup(title='Quiz Completed', content=content, size_hint=(POPUP_WIDTH, 0.5), auto_dismiss=True))
        show_results_btn.bind(on_release=lambda _btn: self.show_results())
        show_results_btn.bind(on_release=popup.dismiss)
        close_btn.bind(on_release=popup.dismiss)
        popup.open()

    def next_question(self):
        if self.review_mode == "All" or not self._review_pool:
            if self.controller.next_question():
                self._update_ui()
        else:
            try:
                cur = self.controller.current_idx
                pool = self._review_pool
                if cur in pool:
                    pos = pool.index(cur)
                    if pos < len(pool) - 1:
                        self.controller.current_idx = pool[pos + 1]
                        self._update_ui()
                else:
                    if pool:
                        self.controller.current_idx = pool[0]
                        self._update_ui()
            except Exception:
                pass
        
        with self.quiz_cache_lock:
            quiz_path = self.quiz_cache.get(self.ids.quiz_spinner.text)
        if quiz_path:
            self._save_session(quiz_path)

    def previous_question(self):
        if self.review_mode == "All" or not self._review_pool:
            if self.controller.previous_question():
                self._update_ui()
        else:
            try:
                cur = self.controller.current_idx
                pool = self._review_pool
                if cur in pool:
                    pos = pool.index(cur)
                    if pos > 0:
                        self.controller.current_idx = pool[pos - 1]
                        self._update_ui()
                else:
                    if pool:
                        self.controller.current_idx = pool[0]
                        self._update_ui()
            except Exception:
                pass
        
        with self.quiz_cache_lock:
            quiz_path = self.quiz_cache.get(self.ids.quiz_spinner.text)
        if quiz_path:
            self._save_session(quiz_path)

    def _save_session(self, quiz_path: str):
        self._flush_timer_now()
        try:
            sess_path = _session_file_for_quiz(quiz_path)
            answered_rows = []
            for key, data in self.controller.answered_questions.items():
                answered_rows.append({
                    "key": list(key),
                    "selected_letter": data.get('selected_letter')
                })
            data = {
                "current_idx": self.controller.current_idx,
                "answered": answered_rows,
                "specialty_filter": self.specialty_filter,
                "limit_questions": bool(self.limit_questions),
                "notes": self._notes,
                "marked": list(self._marked),
                "per_q_seconds": {json.dumps(list(k)): v for k, v in self._per_q_seconds.items()},
            }
            with open(sess_path, 'w', encoding='utf-8') as fp:
                json.dump(data, fp, indent=2)
        except Exception:
            pass

    def show_results(self):
        qlen = len(self.controller.questions)
        pct = (self.controller.score / qlen * 100) if qlen else 0
        results_text = f"Quiz: {self.controller.quiz_score.quiz_name}\n\nScore: {self.controller.score}/{qlen} ({pct:.1f}%)\n\n"
        if self.controller.category_scores:
            results_text += "Category Breakdown:\n"
            for cat in sorted(self.controller.category_scores):
                stats = self.controller.category_scores[cat]
                cat_pct = (stats['correct'] / stats['total'] * 100) if stats['total'] else 0
                results_text += f"• {cat}: {stats['correct']}/{stats['total']} ({cat_pct:.1f}%)\n"

        content = BoxLayout(orientation='vertical', padding=PADDING_DEFAULT, spacing=SPACING_DEFAULT)
        scroll = ScrollView(do_scroll_x=False)
        results_label = Label(text=results_text, text_size=(dp(300), None), size_hint_y=None, height=dp(500))
        results_label.bind(texture_size=lambda instance, size: setattr(instance, 'height', size[1]))
        scroll.add_widget(results_label)
        content.add_widget(scroll)
        buttons = BoxLayout(size_hint_y=None, height=BUTTON_HEIGHT, spacing=SPACING_DEFAULT)
        export_btn = Button(text='Export Results')
        close_btn = Button(text='Close')
        export_btn.bind(on_release=lambda _btn: self.export_results())
        buttons.add_widget(export_btn)
        buttons.add_widget(close_btn)
        content.add_widget(buttons)
        popup = PopupManager.track(Popup(title='Quiz Results', content=content, size_hint=(0.9, 0.8), auto_dismiss=True))
        close_btn.bind(on_release=popup.dismiss)
        popup.open()

    def _build_results_csv(self) -> str:
        import csv
        from io import StringIO
        f = StringIO()
        w = csv.writer(f)
        w.writerow(["Question #", "Title", "Specialty", "Selected", "Correct Letter", "Correct?", "Correct Option Text", "Time (seconds)", "Marked", "Note"])
        for q in self.controller.questions:
            key = self.controller._question_key(q)
            ans = self.controller.answered_questions.get(key)
            sel = ans.get('selected_letter') if ans else ""
            correct_letter = q.get('answer') or ""
            correct_text = next((text for letter, text in q.get('options', []) if letter == correct_letter), "")
            is_correct = ans.get('correct') if ans else False
            time_spent = self._per_q_seconds.get(key, 0)
            is_marked = "YES" if key in self._marked else "NO"
            note_text = self._notes.get(str(list(key)), "")
            w.writerow([q.get('number', ""), q.get('title', ""), q.get('specialty', ""),
                        sel, correct_letter, "YES" if is_correct else "NO", correct_text,
                        f"{time_spent:.1f}", is_marked, note_text])
        return f.getvalue()

    def export_results(self):
        self._flush_timer_now()
        if not self.controller.quiz_score:
            PopupManager.show_error("No results to export")
            return
        try:
            # Ensure latest results are written
            self.controller.quiz_score.print_results()
            results_path = os.path.join(
                self.controller.quiz_score.results_dir,
                f"MLA_Tests_results_{self.controller.quiz_score.quiz_name}_{self.controller.quiz_score.current_date}_{self.controller.quiz_score.session}.txt"
            )
            with open(results_path, 'r', encoding='utf-8') as f:
                content = f.read()

            csv_content = self._build_results_csv()

            if platform != 'android':
                save_path = filechooser.save_file(
                    title="Save Quiz Results",
                    filters=["*.txt"],
                    defaultextension=".txt",
                    initial_file=f"MLA_Quiz_Results_{self.controller.quiz_score.quiz_name}.txt"
                )
                if not save_path or (isinstance(save_path, list) and not save_path):
                    Popup(title='Export Cancelled', content=Label(text=self.l10n.get('export_cancelled'), halign='center'), size_hint=(POPUP_WIDTH, POPUP_HEIGHT)).open()
                    return
                if isinstance(save_path, list):
                    save_path = save_path[0]
                with open(save_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                    
                base_without_ext, _ = os.path.splitext(save_path)
                csv_path = f"{base_without_ext}.csv"
                with open(csv_path, 'w', encoding='utf-8', newline='') as fcsv:
                    fcsv.write(csv_content)
                    
                Popup(
                    title='Results Exported',
                    content=Label(text=self.l10n.get('results_exported', path=f"{save_path}\n{csv_path}"), text_size=(dp(300), None), halign='center'),
                    size_hint=(POPUP_WIDTH, POPUP_HEIGHT)
                ).open()
                return

            from jnius import autoclass
            Intent = autoclass('android.content.Intent')
            PythonActivity = autoclass('org.kivy.android.PythonActivity')
            Environment = autoclass('android.os.Environment')
            ContentValues = autoclass('android.content.ContentValues')
            MediaStore = autoclass('android.provider.MediaStore')
            BuildVer = autoclass('android.os.Build$VERSION')

            if BuildVer.SDK_INT >= 29:
                try:
                    values = ContentValues()
                    resolver = PythonActivity.mActivity.getContentResolver()

                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, f"MLA_Quiz_Results_{self.controller.quiz_score.quiz_name}.txt")
                    values.put(MediaStore.MediaColumns.MIME_TYPE, "text/plain")
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    uri_txt = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    if uri_txt:
                        os_txt = resolver.openOutputStream(uri_txt)
                        os_txt.write(content.encode('utf-8')); os_txt.close()

                    values = ContentValues()
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, f"MLA_Quiz_Results_{self.controller.quiz_score.quiz_name}.csv")
                    values.put(MediaStore.MediaColumns.MIME_TYPE, "text/csv")
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    uri_csv = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    if uri_csv:
                        os_csv = resolver.openOutputStream(uri_csv)
                        os_csv.write(csv_content.encode('utf-8')); os_csv.close()

                    Popup(
                        title='Results Exported',
                        content=Label(
                            text=f"Saved to Downloads:\nMLA_Quiz_Results_{self.controller.quiz_score.quiz_name}.txt\nMLA_Quiz_Results_{self.controller.quiz_score.quiz_name}.csv",
                            text_size=(dp(300), None), halign='center'
                        ),
                        size_hint=(POPUP_WIDTH, POPUP_HEIGHT)
                    ).open()
                    return
                except Exception:
                    pass

            def on_activity_result(request_code, result_code, data):
                try:
                    if result_code != -1 or data is None:
                        return
                    resolver = PythonActivity.mActivity.getContentResolver()

                    if request_code == 43:
                        uri = data.getData()
                        if uri:
                            out = resolver.openOutputStream(uri)
                            out.write(content.encode('utf-8')); out.close()
                        intent2 = Intent(Intent.ACTION_CREATE_DOCUMENT)
                        intent2.addCategory(Intent.CATEGORY_OPENABLE)
                        intent2.setType("text/csv")
                        filename2 = f"MLA_Quiz_Results_{self.controller.quiz_score.quiz_name}.csv"
                        intent2.putExtra(Intent.EXTRA_TITLE, filename2)
                        PythonActivity.mActivity.startActivityForResult(intent2, 44)

                    elif request_code == 44:
                        uri = data.getData()
                        if uri:
                            out = resolver.openOutputStream(uri)
                            out.write(csv_content.encode('utf-8')); out.close()
                        Popup(
                            title='Success',
                            content=Label(text=self.l10n.get('results_saved'), halign='center'),
                            size_hint=(POPUP_WIDTH, POPUP_HEIGHT)
                        ).open()
                except Exception as e:
                    Popup(title='Error', content=Label(text=f'Failed to export results: {e}'), size_hint=(POPUP_WIDTH, POPUP_HEIGHT)).open()
                finally:
                    if request_code in (43, 44):
                        self._cleanup_activity_result()

            global android_activity
            if android_activity is None:
                PopupManager.show_error("Activity not available.")
                return
            try:
                if self._bound_activity_result_cb:
                    android_activity.unbind(on_activity_result=self._bound_activity_result_cb)
            except Exception:
                pass
            android_activity.bind(on_activity_result=on_activity_result)
            self._bound_activity_result_cb = on_activity_result
            self._activity_result_bound = True

            intent = Intent(Intent.ACTION_CREATE_DOCUMENT)
            intent.addCategory(Intent.CATEGORY_OPENABLE)
            intent.setType("text/plain")
            filename = f"MLA_Quiz_Results_{self.controller.quiz_score.quiz_name}.txt"
            intent.putExtra(Intent.EXTRA_TITLE, filename)
            PythonActivity.mActivity.startActivityForResult(intent, 43)

            Popup(
                title='Results',
                content=Label(
                    text='A copy is saved in the app storage.\nSelect a location to export an additional copy.',
                    halign='center'
                ),
                size_hint=(POPUP_WIDTH, POPUP_HEIGHT),
                auto_dismiss=True
            ).open()

        except Exception as e:
            PopupManager.show_error(f"Failed to export results: {e}")

    def _cleanup_activity_result(self):
        global android_activity
        if self._activity_result_bound and android_activity and self._bound_activity_result_cb:
            try:
                android_activity.unbind(on_activity_result=self._bound_activity_result_cb)
            except Exception:
                pass
            finally:
                self._activity_result_bound = False
                self._bound_activity_result_cb = None


class MLAQuizApp(App):
    BUTTON_HEIGHT = NumericProperty(BUTTON_HEIGHT)
    SPACING_DEFAULT = NumericProperty(SPACING_DEFAULT)
    PADDING_DEFAULT = NumericProperty(PADDING_DEFAULT)

    def build(self):
        QuizLoader.init()
        try:
            Window.clearcolor = (0.1, 0.1, 0.1, 1)
            Window.softinput_mode = "below_target"
            Window.bind(on_resize=self.on_window_resize)
            Window.bind(on_keyboard=self._on_key)
            self.main_widget = QuizWidget()
            self.update_orientation()
            return self.main_widget
        except Exception as e:
            import traceback
            error_msg = f"App build error: {str(e)}\n{traceback.format_exc()}"
            log_dir = os.path.join(_get_base_dir(), 'logs')
            os.makedirs(log_dir, exist_ok=True)
            log_file = os.path.join(log_dir, f"build_error_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
            with open(log_file, 'w', encoding='utf-8') as f:
                f.write(error_msg)
            layout = BoxLayout(orientation='vertical', padding=dp(20))
            layout.add_widget(Label(
                text=f"App initialization error:\n{str(e)}\n\nError details have been logged.\n\nPlease restart the app.",
                halign='center'
            ))
            return layout

    def on_window_resize(self, _instance, _width, _height):
        self.update_orientation()

    def _on_key(self, window, key, scancode, codepoint, modifier):
        if key == 27:
            if PopupManager._active_popups:
                try:
                    PopupManager._active_popups[-1].dismiss()
                    return True
                except Exception:
                    pass
            try:
                if isinstance(self.root, QuizWidget):
                    ctrl = self.root.controller
                    if ctrl and ctrl.total_answered and not ctrl.quiz_complete:
                        content = BoxLayout(orientation='vertical', padding=dp(10), spacing=dp(10))
                        content.add_widget(Label(text="Exit the quiz? Your progress is saved and can be resumed.", halign="center"))
                        buttons = BoxLayout(size_hint_y=None, height=dp(40), spacing=dp(10))
                        yes_btn = Button(text="Exit")
                        no_btn = Button(text="Stay")
                        buttons.add_widget(yes_btn); buttons.add_widget(no_btn)
                        content.add_widget(buttons)
                        popup = Popup(title="Confirm Exit", content=content, size_hint=(0.85, 0.4), auto_dismiss=True)

                        def _exit(*_):
                            App.get_running_app().stop()
                        yes_btn.bind(on_release=_exit)
                        no_btn.bind(on_release=popup.dismiss)
                        popup.open()
                        PopupManager.track(popup)
                        return True
            except Exception:
                pass
            # default: allow normal behavior
            return False
        return False

    def update_orientation(self):
        if hasattr(self, 'main_widget'):
            self.main_widget.is_landscape = Window.width > Window.height

    def on_pause(self):
        """Handle app pause - save state"""
        PopupManager.close_all()
        if isinstance(self.root, QuizWidget):
            try:
                self.root._flush_timer_now()
            except Exception:
                pass
            self.root._paused_state = {
                'current_idx': self.root.controller.current_idx,
                'quiz_name': self.root.ids.quiz_spinner.text,
                'score': self.root.controller.score,
                'total_answered': self.root.controller.total_answered
            }
        return True

    def on_resume(self):
        """Handle app resume - restore state"""
        if hasattr(self.root, 'restore_ui_state'):
            Clock.schedule_once(lambda _dt: self._restore_after_resume(), 0.5)
        return True

    def _restore_after_resume(self):
        if isinstance(self.root, QuizWidget):
            if hasattr(self.root, '_paused_state'):
                state = self.root._paused_state
                self.root.controller.current_idx = state.get('current_idx', 0)
                self.root.controller.score = state.get('score', 0)
                self.root.controller.total_answered = state.get('total_answered', 0)

                def update_ui(_dt):
                    self.root.restore_ui_state()
                    if hasattr(self.root, '_paused_state'):
                        del self.root._paused_state
                Clock.schedule_once(update_ui, 0.1)

    def on_stop(self):
        """Handle app stop - cleanup resources"""
        if isinstance(self.root, QuizWidget):
            self.root.cleanup()
            PopupManager.close_all()
        return True

    def on_start(self):
        if platform == 'android':
            from jnius import autoclass
            Build = autoclass('android.os.Build$VERSION')

            def after_permission(granted):
                if not granted:
                    content = BoxLayout(orientation='vertical', padding=PADDING_DEFAULT, spacing=SPACING_DEFAULT)
                    content.add_widget(Label(
                        text='This app may need storage permissions to access quiz files on older Android versions.\nPlease grant permissions in the next prompt or in Settings > Apps > MLA Quiz.',
                        halign='center', text_size=(dp(300), None)
                    ))
                    buttons = BoxLayout(size_hint_y=None, height=BUTTON_HEIGHT, spacing=SPACING_DEFAULT)
                    settings_btn = Button(text='Open Settings')
                    ok_btn = Button(text='OK')
                    buttons.add_widget(settings_btn)
                    buttons.add_widget(ok_btn)
                    popup = PopupManager.track(Popup(title='Permission Required', content=content, size_hint=(0.85, 0.4), auto_dismiss=True))

                    def on_settings_button(*_args):
                        try:
                            Intent = autoclass('android.content.Intent')
                            Settings = autoclass('android.provider.Settings')
                            Uri = autoclass('android.net.Uri')
                            PythonActivity = autoclass('org.kivy.android.PythonActivity')
                            intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                            package_name = PythonActivity.mActivity.getPackageName()
                            intent.setData(Uri.parse(f'package:{package_name}'))
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            PythonActivity.mActivity.startActivity(intent)
                        except Exception:
                            PopupManager.show_error("Failed to open settings. Please navigate to Settings > Apps > MLA Quiz manually.")
                        popup.dismiss()

                    settings_btn.bind(on_release=on_settings_button)
                    ok_btn.bind(on_release=popup.dismiss)
                    popup.open()

            # Request legacy permission only for API < 30
            if Build.SDK_INT < 30:
                StoragePermissionHandler.check_storage_permissions(after_permission)
            else:
                after_permission(True)

        super().on_start()


# Test the Investigation pattern when running directly
# QuizLoader.test_investigation_pattern()

if __name__ == '__main__':
    import sys
    import os
    
    # Check for test mode before any Kivy imports
    if len(sys.argv) > 1 and sys.argv[1] == '--test-investigations':
        # Disable Kivy argument parsing for test mode
        os.environ['KIVY_NO_ARGS'] = '1'
        
        print("Testing Investigation pattern recognition...")
        QuizLoader.test_investigation_pattern()
        
        # Test with actual file content if available
        test_files = ['UKMLA.md', 'Questions/UKMLA Master.md']
        for test_file in test_files:
            if os.path.exists(test_file):
                print(f"\nAnalyzing {test_file}...")
                try:
                    with open(test_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    QuizLoader.analyze_investigation_variations(content)
                except Exception as e:
                    print(f"Error reading {test_file}: {e}")
                break
        sys.exit(0)  # Exit after testing
    
    # Normal app run
    MLAQuizApp().run()
