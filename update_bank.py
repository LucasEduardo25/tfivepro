import json
import re
import unicodedata

def normalize(name):
    name = ''.join(c for c in unicodedata.normalize('NFD', name)
                  if unicodedata.category(c) != 'Mn')
    return name.lower().strip()

with open('src/data/exerciseBank.ts', 'r', encoding='utf-8') as f:
    original_code = f.read()

# We need to extract the existing INITIAL_EXERCISES
# It's an array of objects.
match = re.search(r'export const INITIAL_EXERCISES: Exercise\[\] = (\[.*\]);', original_code, re.DOTALL)
if match:
    try:
        # A bit risky to JSON parse a TS object if it has trailing commas or unquoted keys, 
        # but let's see if we can just append to it or use a node script instead to preserve the original.
        pass
    except Exception as e:
        print(e)
else:
    print("Not found")

