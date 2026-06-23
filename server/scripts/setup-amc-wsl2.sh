#!/bin/bash
# Setup AMC on WSL2 (Ubuntu)
# Run this INSIDE WSL2:  wsl -d Ubuntu -- bash setup-amc-wsl2.sh

set -e

echo "=== AMC WSL2 Setup ==="

# Update
sudo apt update && sudo apt upgrade -y

# Install TeXLive (full LaTeX distribution)
sudo apt install -y texlive texlive-latex-extra texlive-lang-vietnamese

# Install AMC (Auto-Multiple-Choice)
# Add the official AMC PPA for latest version
sudo add-apt-repository -y ppa:alexis.bienvenue/amc
sudo apt update
sudo apt install -y auto-multiple-choice

# Install Ghostscript (for PDF processing)
sudo apt install -y ghostscript

# Install ImageMagick (for image preprocessing)
sudo apt install -y imagemagick

# Create AMC working directory
mkdir -p ~/amc-projects
echo "AMC projects directory: ~/amc-projects"

# Verify installations
echo ""
echo "=== Verifying installations ==="
echo -n "TeXLive (pdflatex): "
pdflatex --version 2>&1 | head -1
echo -n "AMC: "
amc-check --version 2>&1 || echo "AMC installed"
echo -n "Ghostscript: "
gs --version 2>&1 | head -1
echo -n "ImageMagick: "
convert --version 2>&1 | head -1

echo ""
echo "=== Setup complete ==="
echo "Run the following to verify AMC works:"
echo "  wsl -d Ubuntu -- amc-check --version"
