
import os
import re

def find_missing_imports(directory):
    ionic_pattern = re.compile(r'<Ionicons|Ionicons\.', re.IGNORECASE)
    import_pattern = re.compile(r"import\s+{\s*Ionicons\s*}\s+from\s+'@expo/vector-icons'")
    
    missing_files = []
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.js') or file.endswith('.jsx') or file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if ionic_pattern.search(content):
                        if not import_pattern.search(content):
                            missing_files.append(path)
    
    return missing_files

if __name__ == "__main__":
    src_dir = r'c:\Users\HARIPRIYAN\Desktop\course_finder\frontend\src'
    missing = find_missing_imports(src_dir)
    print("Files missing Ionicons import:")
    for m in missing:
        print(m)
