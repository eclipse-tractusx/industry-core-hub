# Instructions for Local Postgres Deployment


# Instructions for Local Postgres Deployment

## Prerequisites
- Docker installed on your machine.
- `docker-compose` available (usually comes with Docker Desktop).

## Deployment Steps

1. Configure the a `docker-compose.yml` file in this directory with the following content:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: local_postgres
    restart: always
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: ichub
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

2. Start the Postgres container:

```bash
docker-compose up -d
```

3. Verify the container is running:

```bash
docker ps
```

You should see `local_postgres` running and bound to port `5432`.

4. Connect to the database using any Postgres client:

- **Host:** `localhost`
- **Port:** `5432`
- **Database:** `ichub`
- **Username:** `user`
- **Password:** `password`

5. Connect via `psql` CLI (optional):

```bash
psql -h localhost -U myuser -d mydatabase
```

## Optional: Add pgAdmin for easier database management

You can extend the `docker-compose.yml` file to include pgAdmin. Below is an updated example:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: local_postgres
    restart: always
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: ichub
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  pgadmin:
    image: dpage/pgadmin4
    container_name: local_pgadmin
    restart: always
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### Accessing pgAdmin
- Open your browser and go to: http://localhost:5050
- Login using:
  - **Email:** `admin@admin.com`
  - **Password:** `admin`
- Add a new server connection in pgAdmin:
  - **Host:** `postgres`
  - **Port:** `5432`
  - **Database:** `ichub`
  - **Username:** `user`
  - **Password:** `password`

This will allow you to easily inspect and manage your Postgres database through a web interface.

## Notes
- The `volumes:` directive ensures your database data persists across container restarts.
- Change `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` as needed.