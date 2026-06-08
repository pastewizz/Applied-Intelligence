import subprocess
import sys
import time
import os

def main():
    print("Starting Applied Intelligence Development Servers...")
    
    # Start Backend
    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--reload"],
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
    
    # Start Frontend
    frontend = subprocess.Popen(
        ["npm", "run", "dev"], 
        cwd=os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend"),
        shell=True
    )

    try:
        # Keep the main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        # Terminate processes
        backend.terminate()
        frontend.terminate()
        
        backend.wait()
        frontend.wait()
        print("Shutdown complete.")

if __name__ == "__main__":
    main()
