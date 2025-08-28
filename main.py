from dotenv import load_dotenv
import os

load_dotenv() # .env 파일에서 환경 변수를 로드합니다.

# 이제 os.getenv("OPENAI_API_KEY") 와 같이 변수를 사용할 수 있습니다.
api_key = os.getenv("OPENAI_API_KEY")