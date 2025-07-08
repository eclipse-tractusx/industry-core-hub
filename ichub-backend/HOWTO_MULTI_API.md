# FastAPI: Multiple APIs on Different Ports and Authentication Schemes

## Can a FastAPI App Offer Separate APIs Under Different Ports?

**FastAPI itself does not natively support running a single app on multiple ports.**  
However, you can achieve this by running multiple FastAPI app instances, each on a different port, or by using a reverse proxy.

### **Approach 1: Multiple FastAPI Apps, Multiple Ports**

Create separate FastAPI app instances and run each on a different port:

```python
# main_public.py
from fastapi import FastAPI
app_public = FastAPI()
# ... define public routes ...

# main_admin.py
from fastapi import FastAPI
app_admin = FastAPI()
# ... define admin routes ...
```

Run each app on a different port:
```sh
uvicorn main_public:app_public --port 8000
uvicorn main_admin:app_admin --port 8001
```

---

### **Approach 2: Single App, Different Authentication per Path**

Use FastAPI's dependency injection and APIRouter to apply different authentication schemes to different routers or endpoints:

```python
from fastapi import FastAPI, Depends, APIRouter
from fastapi.security import OAuth2PasswordBearer, OAuth2AuthorizationCodeBearer

app = FastAPI()

# OAuth2 client credentials flow
oauth2_scheme_client = OAuth2AuthorizationCodeBearer(
    authorizationUrl="https://example.com/auth",
    tokenUrl="https://example.com/token"
)

# Username/password flow
oauth2_scheme_password = OAuth2PasswordBearer(tokenUrl="https://example.com/token")

public_router = APIRouter()
admin_router = APIRouter()

@public_router.get("/public")
async def public_endpoint(token: str = Depends(oauth2_scheme_client)):
    return {"msg": "Public API with client credentials"}

@admin_router.get("/admin")
async def admin_endpoint(token: str = Depends(oauth2_scheme_password)):
    return {"msg": "Admin API with username/password"}

app.include_router(public_router, prefix="/api")
app.include_router(admin_router, prefix="/admin")
```

---

### **Approach 3: Reverse Proxy**

Use a reverse proxy (like Nginx or Traefik) to expose different paths or subdomains on different ports, and enforce different authentication at the proxy level.

---

## **Summary Table**

| Approach                        | Multiple Ports | Different Auth per Path | Notes                        |
|----------------------------------|:-------------:|:----------------------:|------------------------------|
| Multiple FastAPI apps/processes  |      ✔️       |           ✔️           | Most flexible, more infra    |
| Single app, routers/dependencies |      ❌       |           ✔️           | Simpler, one process         |
| Reverse proxy                    |      ✔️       |           ✔️           | Proxy config, more advanced  |

---

## **Best Practice**

- **For different authentication per API path:** Use routers and dependencies in a single FastAPI app.
- **For different ports:** Run separate FastAPI apps/processes, or use a reverse proxy.

You can combine both approaches for maximum flexibility.

---

**References:**
- [FastAPI Security Docs](https://fastapi.tiangolo.com/tutorial/security/)
- [FastAPI APIRouter Docs](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
