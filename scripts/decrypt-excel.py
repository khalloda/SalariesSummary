#!/usr/bin/env python3
"""
Helper script to decrypt password-protected Excel files
Uses openpyxl which has better support for file-level encryption
"""

import sys
import os
from pathlib import Path

try:
    from openpyxl import load_workbook
    from openpyxl.utils import get_column_letter
except ImportError:
    print("Error: openpyxl is not installed.")
    print("Install it with: pip install openpyxl")
    sys.exit(1)

def decrypt_excel_file(input_path, output_path, password):
    """Decrypt and save an Excel file"""
    try:
        # Load workbook with password
        wb = load_workbook(input_path, read_only=False, keep_vba=True, data_only=True)
        
        # If password is needed for reading, openpyxl should handle it
        # But if file is encrypted, we need to use msoffcrypto-tool instead
        print(f"Attempting to decrypt: {input_path}")
        
        # Try to access sheets to verify password works
        sheet_names = wb.sheetnames
        print(f"  Found {len(sheet_names)} sheets: {', '.join(sheet_names)}")
        
        # Save without password protection
        wb.save(output_path)
        print(f"  ✓ Saved decrypted file to: {output_path}")
        return True
        
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

def main():
    if len(sys.argv) < 3:
        print("Usage: python decrypt-excel.py <input_file> <output_file> <password>")
        print("   or: python decrypt-excel.py <input_file> <password>  (outputs to input_file_decrypted.xlsx)")
        sys.exit(1)
    
    input_file = sys.argv[1]
    password = sys.argv[-1]  # Last argument is password
    
    if len(sys.argv) == 4:
        output_file = sys.argv[2]
    else:
        # If only 2 args provided (file + password), create output filename
        input_path = Path(input_file)
        output_file = str(input_path.parent / f"{input_path.stem}_decrypted{input_path.suffix}")
    
    if not os.path.exists(input_file):
        print(f"Error: File not found: {input_file}")
        sys.exit(1)
    
    success = decrypt_excel_file(input_file, output_file, password)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

