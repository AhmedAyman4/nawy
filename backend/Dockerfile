# Use an official Python 3.11 runtime as a parent image to satisfy package requirements
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /code

# Copy the requirements file into the container
COPY ./requirements.txt /code/requirements.txt

# Install dependencies
# --no-cache-dir keeps the image size small
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Set up a new user named "user" with user ID 1000
# (Hugging Face Spaces requires this to avoid running as root)
RUN useradd -m -u 1000 user

# Switch to the "user" user
USER user

# Set home to the user's home directory
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Set the working directory to the user's home directory
WORKDIR $HOME/app

# --- NEW CACHE STEP ---
# Pre-download the HuggingFace embedding model into the user's cache directory during build.
# This prevents the app from downloading the ~1.2GB model every time the container starts up.
RUN python -c "from langchain_huggingface import HuggingFaceEmbeddings; HuggingFaceEmbeddings(model_name='Qwen/Qwen3-Embedding-0.6B', model_kwargs={'trust_remote_code': True})"

# Copy the current directory contents into the container at $HOME/app 
# Ensure the new user owns these files
COPY --chown=user . $HOME/app

# Hugging Face Spaces route traffic to port 7860
EXPOSE 7860

# Command to run the FastAPI application using Uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]