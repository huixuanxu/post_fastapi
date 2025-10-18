import React, { useState, useEffect, useCallback } from 'react'; // 移除 useMemo
import { HeartFilled, MessageOutlined, SendOutlined } from '@ant-design/icons';

// --- FastAPI API Configuration ---
const API_BASE_URL = 'https://post-fastapi-w76x.onrender.com';
const POST_ID = 1; // 始終針對 ID 為 1 的貼文進行操作

// 這是用於顯示個別留言的組件
const CommentCard = ({ author, text, timestamp }) => (
    <div className="border border-gray-200 bg-gray-50 p-4 rounded-md shadow-sm">
        <p className="text-sm text-gray-700 mb-2 whitespace-pre-line">{text}</p>
        <p className="text-xs text-gray-500 mt-2">
              {new Date(timestamp * 1000).toLocaleString()}
        </p>
        <p className="text-right text-xs text-indigo-700 font-semibold mt-1">By {author}</p>
    </div>
);

function Post() {
    // 狀態：儲存從後端獲取的貼文資料
    const [postData, setPostData] = useState(null);
    // 狀態：按讚數量 (從後端資料初始化)
    const [likeCount, setLikeCount] = useState(0); 
    // 狀態：管理按讚按鈕是否被點擊過（用於前端 UI 視覺效果）
    const [isLiked, setIsLiked] = useState(false); 
    // 狀態：留言輸入框內容
    const [commentText, setCommentText] = useState('');
    // 狀態：載入與錯誤處理
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);


    // --- 1. 數據載入 (GET /post/{id}) ---
    const fetchPostData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/post/${POST_ID}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // 設置狀態
            setPostData(data);
            setLikeCount(data.initialLikes); // 使用後端提供的 initialLikes
        } catch (err) {
            console.error("無法載入貼文資料:", err);
            setError("無法載入貼文資料，請確認 FastAPI 伺服器是否運行在 port 8000。");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPostData();
    }, [fetchPostData]);


    // --- 2. 按讚處理 (PUT /like/{id}) ---
    const handleLike = useCallback(async () => {
        // 決定是增加 (increment) 還是減少 (decrement)
        const action = isLiked ? 'decrement' : 'increment';
        const isIncrement = action === 'increment';
        
        // 1. Optimistic Update: 先更新 UI (為了更好的使用者體驗)
        setLikeCount(prev => isIncrement ? prev + 1 : prev - 1);
        setIsLiked(isIncrement);

        try {
            const response = await fetch(`${API_BASE_URL}/like/${POST_ID}?action=${action}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error('伺服器更新按讚數失敗。');
            }
            // 伺服器成功，UI 維持現狀即可
            
        } catch (error) {
            console.error("按讚失敗，回滾狀態:", error);
            // 失敗時，回滾 UI 狀態
            setLikeCount(prev => isIncrement ? prev - 1 : prev + 1);
            setIsLiked(!isIncrement);
            // 由於不能使用 alert()，我們將錯誤印出在 console
            console.error('按讚/取消失敗，請檢查後端連線。'); 
        }
    }, [isLiked]);

    
    // 處理送出留言 (POST /comments)
    const handleSubmitComment = useCallback(async (e) => {
        e.preventDefault();
        if (commentText.trim() === '') return;
        
        // 準備發送給 FastAPI 的 payload
        const newCommentPayload = {
            author: 'Current User', // 模擬使用者名稱
            text: commentText.trim(),
        };

        try {
            const response = await fetch(`${API_BASE_URL}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newCommentPayload),
            });

            if (!response.ok) {
                throw new Error('留言提交到伺服器失敗。');
            }

            const addedComment = await response.json();
            
            // 更新狀態：將新留言添加到最前面
            setPostData(prev => ({
                ...prev,
                comments: [addedComment, ...prev.comments],
            }));

            setCommentText(''); // 清空輸入框

        } catch (error) {
            console.error("留言提交失敗:", error);
            console.error('留言提交失敗，請檢查後端。');
        }
    }, [commentText]);

    
    // Loading/Error 畫面處理
    if (isLoading) {
        return (
            <div className="p-8 max-w-2xl mx-auto bg-gray-50 min-h-screen">
                <div className="flex justify-center items-center h-48">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
                    <p className="ml-4 text-xl text-indigo-600">從 FastAPI 伺服器載入中...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 max-w-2xl mx-auto bg-red-100 border-l-4 border-red-500 text-red-700">
                <p className="font-bold">載入錯誤</p>
                <p>{error}</p>
                <p className="mt-2 text-sm">請確認後端終端機是否顯示：<code className="font-mono">INFO: Uvicorn running on http://127.0.0.1:8000</code></p>
            </div>
        );
    }
    
    // 如果載入成功，提取資料
    const { title, author, content, comments } = postData;
    
    // 根據 isLiked 狀態調整愛心顏色 (Tailwind 類別)
    const likeColor = isLiked ? 'text-red-500 fill-red-500' : 'text-gray-500 fill-gray-400';

    return (
        // 外部容器：居中顯示貼文內容
        <div className="w-full h-auto flex justify-center p-4 sm:p-8 bg-gray-100 min-h-screen font-inter">
            {/* 兩欄佈局：max-w-6xl 限制最大寬度，小螢幕單欄，中等以上螢幕分為 3 欄 */}
            <div className="grid gap-8 max-w-6xl w-full grid-cols-1 md:grid-cols-3">
                
                {/* 左欄：貼文主體 (Article Body) - 佔用 2 欄 */}
                <div className={`shadow-lg hover:shadow-xl transition duration-300 ease-in-out bg-white rounded-xl p-5 md:col-span-2`}>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1 border-b pb-2">{title}</h1>
                    <p className="text-sm text-indigo-600 mb-6 font-medium">作者: {author}</p>
                    
                    {/* 貼文內容區 */}
                    <p className="text-base text-gray-700 leading-relaxed mb-6 whitespace-pre-line">{content}</p>
                    
                    {/* 圖片佔位符 */}
                    <div className="bg-gray-200 h-48 flex items-center justify-center text-gray-600 italic rounded-md mb-6 border border-dashed border-gray-400">
                        文章圖片佔位符
                    </div>

                    {/* 按讚及留言按鈕區 */}
                    <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
                        {/* 實作按讚按鈕與狀態管理 */}
                        <button 
                            onClick={handleLike} // 綁定按讚事件
                            className={`flex items-center hover:scale-105 transition duration-150 ease-in-out ${likeColor}`}
                        >
                            {/* Antd HeartFilled Icon */}
                            <HeartFilled className="h-5 w-5 mr-1 text-xl" />
                            <span className="font-semibold">{likeCount}</span>
                        </button>
                        
                        {/* 留言數顯示 */}
                        <div className="text-gray-500 flex items-center transition duration-150">
                            {/* Antd MessageOutlined Icon */}
                            <MessageOutlined className="h-5 w-5 mr-1 text-xl" />
                            {/* 留言數從狀態中獲取 */}
                            <span>{comments.length}</span> 
                        </div>
                    </div>
                </div>

                {/* 右欄：留言區塊 (Comments Panel) - 佔用 1 欄 */}
                <div className="md:col-span-1 p-4">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">留言區</h2>
                    
                    {/* 留言輸入區塊 */}
                    <form onSubmit={handleSubmitComment} className="mb-6 p-4 text-gray-500 bg-white rounded-lg shadow-md border border-gray-200">
                        <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            rows="3"
                            placeholder="留下評論..."
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none mb-3 transition duration-150"
                        />
                        <button
                            type="submit"
                            disabled={commentText.trim() === ''}
                            className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-150 transform hover:scale-[1.01]"
                        >
                            <SendOutlined className="mr-2" /> 送出留言
                        </button>
                    </form>

                    {/* 留言列表 */}
                    <div className="space-y-4">
                        {comments.length > 0 ? (
                            comments.map(comment => (
                                <CommentCard key={comment.id} {...comment} />
                            ))
                        ) : (
                            <p className="text-gray-500 italic text-center py-4">目前沒有留言，快來搶頭香！</p>
                        )}
                    </div>
                    
                    <div className="mt-8 pt-4 border-t text-sm text-gray-500 text-center">
                        <p>後端 API 文件: <a href={`${API_BASE_URL}/docs`} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">FastAPI /docs</a></p>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Post;
