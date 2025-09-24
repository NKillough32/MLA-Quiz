#!/usr/bin/env python3
"""
Vercel Serverless Function Entry Point for MLA Quiz PWA
This file exports the Flask app for Vercel's serverless environment
"""

import os
import sys

# Add parent directory to path to import app
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

# Import the Flask app
from app import app

# Export the app object for Vercel
# Vercel's @vercel/python runtime looks for this
app = app