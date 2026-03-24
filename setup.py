
---

### **setup.py**

```python
#!/usr/bin/env python3
"""
OSINT Automation Platform - Setup Script
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read README
this_directory = Path(__file__).parent
long_description = (this_directory / "README.md").read_text()

# Read requirements
requirements = (this_directory / "requirements.txt").read_text().splitlines()

setup(
    name="osint-automation-platform",
    version="1.0.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="Comprehensive OSINT automation platform for cybersecurity professionals",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/YOUR_USERNAME/osint-automation-platform",
    packages=find_packages(exclude=["tests", "tests.*", "docs"]),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Information Technology",
        "Topic :: Security",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "osint-platform=osint_platform.cli.commands:cli",
        ],
    },
    include_package_data=True,
    package_data={
        "osint_platform": ["config/*.yaml", "templates/*.html"],
    },
    zip_safe=False,
)
