# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict
import time

# --- 1. 初始化 FastAPI 應用 ---
app = FastAPI(title="Blog Post API")

# --- 2. 配置 CORS ---
origins = [
    "https://post-fastapi.vercel.app",  # ✅ 你的正式前端網址（Vercel）
    "https://post-fastapi-git-main-huixuanxus-projects.vercel.app",  # ✅ 預覽網址（Vercel 分支）
    "http://localhost:3000",  # ✅ 本地測試
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # 允許的前端來源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. 定義資料模型 ---
class Comment(BaseModel):
    id: int
    author: str
    text: str = Field(..., min_length=1)
    timestamp: float

class NewComment(BaseModel):
    author: str = "Current User"
    text: str = Field(..., min_length=1)

class PostData(BaseModel):
    id: int
    title: str
    author: str
    content: str
    initial_likes: int = Field(alias="initialLikes")
    comments: List[Comment]

# --- 4. 模擬資料庫 ---
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
        ],
    )
}

# --- 5. API 端點 ---

# ➕ Render 健康檢查專用（讓 Render 檢測應用啟動成功）
@app.get("/")
def health_check():
    return {"status": "ok", "message": "FastAPI server running successfully"}

# 取得貼文內容
@app.get("/post/{post_id}", response_model=PostData, tags=["Post"])
def get_post_data(post_id: int):
    if post_id not in DB:
        raise HTTPException(status_code=404, detail="Post not found")
    time.sleep(0.5)
    return DB[post_id]

# 新增留言
@app.post("/comments", response_model=Comment, tags=["Comment"])
def add_comment(new_comment: NewComment):
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

# 更新按讚數
@app.put("/like/{post_id}", tags=["Post"])
def update_likes(post_id: int, action: str):
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
