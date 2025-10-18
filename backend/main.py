# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict
import time

# --- 1. 定義資料模型 (Pydantic Models) ---
# 用於定義留言的格式
class Comment(BaseModel):
    id: int
    author: str
    text: str = Field(..., min_length=1)
    timestamp: float

# 用於驗證和定義從前端接收到的新留言格式
class NewComment(BaseModel):
    author: str = "Current User"
    text: str = Field(..., min_length=1)

# 用於定義貼文的完整格式
class PostData(BaseModel):
    id: int
    title: str
    author: str
    content: str
    initial_likes: int = Field(alias="initialLikes") # 匹配前端的 initialLikes
    comments: List[Comment]

# --- 2. 模擬資料庫 (In-memory Storage) ---
# 這是我們伺服器端唯一且儲存狀態的地方
DB: Dict[int, PostData] = {
    1: PostData(
        id=1,
        title="FastAPI 後端貼文範例",
        author="By Server",
        content="這段內容是從模擬的 FastAPI 後端提供的。\n\n現在我們來測試前後端的整合！",
        initialLikes=5,
        comments=[
            Comment(id=1, author="Amada", text="這是第一則留言，現在由 FastAPI 控制。", timestamp=time.time() - 3600),
            Comment(id=2, author="Alex", text="模擬的 API 資料正在這裡顯示。", timestamp=time.time() - 1800),
        ]
    )
}

# --- 3. 初始化 FastAPI 應用 ---
app = FastAPI(title="Blog Post API")

# --- 4. 配置 CORS (跨域資源共享) ---
# 1. Vercel 官方產生的主要網址 (這是瀏覽器發出請求的網址)
Vercel_Official_URL = "https://post-fastapi-frontend.vercel.app" 

# 2. Vercel 的專案網址或分支網址 (保留以防萬一)
Vercel_Preview_URL = "https://post-fastapi-git-main-huixuanxus-projects.vercel.app" 
# 注意：為了相容性，我們移除了網址末尾的 "/"

origins = [
    Vercel_Official_URL,
    Vercel_Preview_URL,
    "http://localhost:3000", # 本地開發用的網址
]

  

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)


# --- 5. API 端點定義 ---

# 獲取貼文詳情 (GET)
@app.get("/post/{post_id}", response_model=PostData, tags=["Post"])
def get_post_data(post_id: int):
    """
    根據 ID 獲取貼文的內容和留言列表。
    """
    if post_id not in DB:
        raise HTTPException(status_code=404, detail="Post not found")
    
    time.sleep(0.5) 
    return DB[post_id]

# 新增留言 (POST)
@app.post("/comments", response_model=Comment, tags=["Comment"])
def add_comment(new_comment: NewComment):
    """
    為貼文新增一則留言。
    """
    time.sleep(0.2)
    
    comment_data = Comment(
        id=int(time.time() * 1000), 
        timestamp=time.time(),
        **new_comment.model_dump()
    )
    
    post_id = 1 
    if post_id not in DB:
        raise HTTPException(status_code=404, detail="Target post not found")

    DB[post_id].comments.insert(0, comment_data)
    
    print(f"New comment added: {comment_data.text}")
    return comment_data

# 更新按讚數 (PUT)
@app.put("/like/{post_id}", tags=["Post"])
def update_likes(post_id: int, action: str):
    """
    更新貼文的按讚數 (action 應為 'increment' 或 'decrement')。
    """
    if post_id not in DB:
        raise HTTPException(status_code=404, detail="Post not found")
    
    time.sleep(0.1)

    post = DB[post_id]
    
    if action == "increment":
        post.initial_likes += 1
    elif action == "decrement":
        if post.initial_likes > 0:
            post.initial_likes -= 1
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'increment' or 'decrement'")
    
    return {"message": "Likes updated successfully", "new_likes": post.initial_likes}
