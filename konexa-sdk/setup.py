import os
from setuptools import setup, find_packages

setup(
    name="konexa",
    version="0.1.0",
    author="Konexa AI Team",
    author_email="dev@konexa.ke",
    description="The official Python SDK for the Konexa AI API Platform",
    long_description=open("README.md").read() if os.path.exists("README.md") else "Official Konexa SDK",
    long_description_content_type="text/markdown",
    url="https://github.com/konexa-ai/konexa-python",
    packages=find_packages(),
    install_requires=[
        "requests>=2.25.0",
    ],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.7",
)
