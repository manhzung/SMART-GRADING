@echo off
cd /d "C:\TAILIEU\DATN\SMART GRADING\SOICT_DATN_Application_VIE_Template"
echo === Cleaning auxiliary files ===
del /q *.aux *.bbl *.blg *.lof *.lot *.toc *.out *.run.xml DoAn-blx.bib 2>nul
echo === Pass 1 ===
xelatex -interaction=nonstopmode DoAn.tex > nul 2>&1
echo === BibTeX ===
bibtex DoAn > nul 2>&1
echo === Pass 2 ===
xelatex -interaction=nonstopmode DoAn.tex > nul 2>&1
echo === Pass 3 ===
xelatex -interaction=nonstopmode DoAn.tex > nul 2>&1
echo === Pass 4 ===
xelatex -interaction=nonstopmode DoAn.tex > nul 2>&1
echo === Done ===
dir DoAn.pdf | findstr "DoAn.pdf"