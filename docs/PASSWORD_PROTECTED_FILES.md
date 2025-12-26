# Handling Password-Protected Excel Files

## Issue

Some Excel files (October, November, December 2025) are encrypted at the **file level**, not just worksheet level. The current Node.js libraries (xlsx, ExcelJS) have limited support for file-level encryption.

## Solutions

### Option 1: Use Python Script to Decrypt (Recommended)

1. **Install Python dependencies:**
   ```bash
   pip install openpyxl
   ```

2. **Run the decryption script:**
   ```bash
   node scripts/decrypt-all-excel.js
   ```

   This will create decrypted versions: `10- Oct Salaries 2025_decrypted.xlsx`, etc.

3. **Option A: Use decrypted files**
   - Rename the decrypted files to replace originals, or
   - Update the import to look for `*_decrypted.xlsx` files

4. **Option B: Remove password from originals**
   - Open each file in Excel
   - Go to File → Info → Protect Workbook → Encrypt with Password
   - Remove the password and save

### Option 2: Remove File-Level Password in Excel

1. Open the password-protected file in Microsoft Excel
2. Go to **File → Info → Protect Workbook**
3. Click **Encrypt with Password**
4. Clear the password field and click **OK**
5. Save the file

### Option 3: Use LibreOffice to Remove Password

1. Open the file in LibreOffice Calc
2. Go to **File → Save As**
3. Save without password protection
4. Replace the original file

## Current Status

The import system will:
- ✅ Successfully import non-protected files (January - September)
- ❌ Skip password-protected files (October - December) with a clear error message

## Future Enhancement

We could integrate a Python-based decryption service that:
1. Automatically detects password-protected files
2. Uses Python's `openpyxl` or `msoffcrypto-tool` to decrypt
3. Temporarily saves decrypted versions
4. Processes them and cleans up

This would require:
- Python installed on the system
- Python dependencies: `openpyxl` or `msoffcrypto-tool`
- Integration with the Node.js import service

