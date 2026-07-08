import tkinter as tk
import subprocess
import os
from tkinter import messagebox
p=None
def start_node():
    global p
    try:
        p=subprocess.Popen(["node", "index.js"])
        messagebox.showinfo("Thành công", "Đã chạy Node index.js")
        print("Server chạy PID=",p.pid)
    except Exception as e:
        messagebox.showerror("Lỗi", str(e))

def stop_node():
    global p
    try:
        os.system(f"taskkill /PID {p.pid} /F")
    except Exception as e:
        messagebox.showerror("Lỗi", str(e))
        
def start_pm2():
    try:
        os.system("pm2 start server.js")
        messagebox.showinfo("Thành công", "Đã chạy bằng PM2")
    except Exception as e:
        messagebox.showerror("Lỗi", str(e))
#         os.system("pm2 start server.js")

def stop_pm2():
    try:
        os.system("pm2 stop server.js")
        messagebox.showinfo("Thành công", "Đã stop PM2")
    except Exception as e:
        messagebox.showerror("Lỗi", str(e))
#         os.system("pm2 stop server.js")

root = tk.Tk()
root.title("Điều khiển Node Server")

tk.Button(root, text="Chạy Node index.js", width=25, command=start_node).pack(pady=10)
tk.Button(root, text="Stop index.js", width=25, command=stop_node).pack(pady=10)
tk.Button(root, text="Chạy bằng PM2", width=25, command=start_pm2).pack(pady=10)
tk.Button(root, text="Dừng PM2", width=25, command=stop_pm2).pack(pady=10)

root.mainloop()