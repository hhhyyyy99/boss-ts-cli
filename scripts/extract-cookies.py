#!/usr/bin/env python3
"""从浏览器提取 zhipin.com Cookie，输出 JSON"""

import sys, json, os

def extract_chrome():
    try:
        import browser_cookie3
        cj = browser_cookie3.chrome(domain_name='zhipin.com')
        return [
            {
                'name': c.name,
                'value': c.value,
                'domain': c.domain or '.zhipin.com',
                'path': c.path or '/',
                'secure': c.secure or False,
                'httpOnly': False,
            }
            for c in cj
        ]
    except Exception as e:
        print(f'{{"error": "{e}"}}', file=sys.stderr)
        return []

def extract_firefox():
    try:
        import browser_cookie3
        cj = browser_cookie3.firefox(domain_name='zhipin.com')
        return [
            {
                'name': c.name,
                'value': c.value,
                'domain': c.domain or '.zhipin.com',
                'path': c.path or '/',
                'secure': c.secure or False,
                'httpOnly': False,
            }
            for c in cj
        ]
    except Exception as e:
        print(f'{{"error": "{e}"}}', file=sys.stderr)
        return []

def main():
    browser = sys.argv[1] if len(sys.argv) > 1 else 'chrome'
    
    if browser == 'chrome':
        cookies = extract_chrome()
    elif browser == 'firefox':
        cookies = extract_firefox()
    else:
        # Chromium-based browsers use the same Chrome profile
        cookies = extract_chrome()
    
    # 只输出 JSON 到 stdout
    print(json.dumps(cookies, ensure_ascii=False))

if __name__ == '__main__':
    main()
