# AMC WSL2 Setup Guide

## Prerequisites
- Windows 10/11 with WSL2 enabled
- Ubuntu WSL2 installed from Microsoft Store

## Quick Setup

### Step 1: Enable WSL2
Open PowerShell as Administrator and run:
```powershell
wsl --install -d Ubuntu
```

### Step 2: Run Setup Script
1. Copy `setup-amc-wsl2.sh` to a path accessible from WSL (e.g., `C:\AMC\setup-amc-wsl2.sh`)
2. Run inside WSL:
```bash
wsl -d Ubuntu -- bash /mnt/c/AMC/setup-amc-wsl2.sh
```

### Step 3: Verify
```bash
wsl -d Ubuntu -- pdflatex --version
wsl -d Ubuntu -- amc-check --version
wsl -d Ubuntu -- gs --version
```

### Step 4: Create AMC Projects Directory
```bash
wsl -d Ubuntu -- mkdir -p ~/amc-projects
```

## Troubleshooting

### WSL2 not installed
```powershell
wsl --install
# Restart computer
```

### AMC PPA not found
If `add-apt-repository` fails, install AMC directly:
```bash
sudo apt install auto-multiple-choice
```

### Permission errors
Make sure you're running commands with sudo when needed.

## Testing AMC
```bash
# Create a simple test project
mkdir ~/test-amc
cd ~/test-amc
# Copy a .tex file here and run:
amc-check --backend .
amc-compile --n-copies 2 .
```
