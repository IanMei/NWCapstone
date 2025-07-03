mkdir pixshare && cd pixshare

mkdir frontend backend database

cd frontend
npm create vite@latest . --template react-ts
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

mkdir -p src/{assets,components,context,hooks,layouts,pages/admin,themes,utils}

cd ..

cd backend
pipenv install flask flask-cors flask_sqlalchemy flask-jwt-extended python-dotenv
mkdir app
touch app/__init__.py app/routes.py app/models.py app/config.py
touch run.py
cd ..

cd database
mkdir schemas sql
touch schemas/media_schema.json sql/schema.sql
cd ..