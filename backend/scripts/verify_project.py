import os
import sys

def verify():
    print("==================================================")
    print("          FreshLens Project Verification          ")
    print("==================================================")
    
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    root_dir = os.path.dirname(backend_dir)
    print(f"Project root resolved to: {root_dir}")
    
    passed = True
    
    # 1. Check directories
    required_dirs = [
        os.path.join(root_dir, "backend", "app"),
        os.path.join(root_dir, "backend", "ml"),
        os.path.join(root_dir, "frontend", "src")
    ]
    
    print("\n[1] Checking directories...")
    for d in required_dirs:
        rel_path = os.path.relpath(d, root_dir)
        if os.path.isdir(d):
            print(f"  [OK] Found folder: {rel_path}")
        else:
            print(f"  [FAIL] Missing folder: {rel_path}")
            passed = False
            
    # 2. Check files
    required_files = [
        os.path.join(root_dir, ".env.example"),
        os.path.join(root_dir, "backend", ".env.example"),
        os.path.join(root_dir, "backend", "requirements.txt"),
        os.path.join(root_dir, "frontend", "package.json"),
        os.path.join(root_dir, "README.md"),
        os.path.join(root_dir, "docker-compose.yml"),
        os.path.join(root_dir, "docs", "VIVA.md"),
        os.path.join(root_dir, "docs", "PROJECT_STATUS.md"),
        os.path.join(root_dir, "docs", "MODEL_EVALUATION.md"),
        os.path.join(root_dir, "docs", "ROADMAP.md")
    ]
    
    print("\n[2] Checking required configuration files...")
    for f in required_files:
        rel_path = os.path.relpath(f, root_dir)
        if os.path.isfile(f):
            print(f"  [OK] Found file: {rel_path}")
        else:
            print(f"  [FAIL] Missing file: {rel_path}")
            passed = False
            
    # 3. Check for exposed secrets (.env check)
    print("\n[3] Verifying git secret protection...")
    gitignore_path = os.path.join(root_dir, ".gitignore")
    if os.path.isfile(gitignore_path):
        with open(gitignore_path, "r") as gf:
            content = gf.read()
            if ".env" in content:
                print("  [OK] .env patterns found inside root .gitignore.")
            else:
                print("  [FAIL] Warning: .env pattern not found inside root .gitignore!")
                passed = False
    else:
        print("  [FAIL] Missing .gitignore file!")
        passed = False
        
    # Check if .env is tracked via git ls-files
    try:
        import subprocess
        res = subprocess.run(["git", "ls-files", ".env", "backend/.env"], capture_output=True, text=True, cwd=root_dir)
        if res.stdout.strip():
            print(f"  [FAIL] Critical Alert: Secret configuration files are tracked in git index:\n{res.stdout.strip()}")
            passed = False
        else:
            print("  [OK] Checked git index: no .env secret files are tracked.")
    except Exception:
        print("  [WARN] Git command not verified; check index manually.")
        
    print("\n==================================================")
    if passed:
        print("  [OK] SUCCESS: All project verification checks PASSED.")
        print("==================================================")
        sys.exit(0)
    else:
        print("  [FAIL] FAILURE: One or more verification checks failed.")
        print("==================================================")
        sys.exit(1)

if __name__ == "__main__":
    verify()
