postgres=# \c construction_app_database
You are now connected to database "construction_app_database" as user "postgres".
construction_app_database=# \dt
Did not find any relations.
construction_app_database=# \c construction_app_database
You are now connected to database "construction_app_database" as user "postgres".
construction_app_database=# -- Create Users Table
construction_app_database=# CREATE TABLE users (
construction_app_database(#     user_id SERIAL PRIMARY KEY,
construction_app_database(#     username VARCHAR(50) UNIQUE NOT NULL,
construction_app_database(#     email VARCHAR(255) UNIQUE NOT NULL,
construction_app_database(#     password VARCHAR(255) NOT NULL,
construction_app_database(#     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
construction_app_database(#     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
construction_app_database(# );
CREATE TABLE
construction_app_database=#
construction_app_database=# -- Create JobAdverts Table
construction_app_database=# CREATE TABLE job_adverts (
construction_app_database(#     job_advert_id SERIAL PRIMARY KEY,
construction_app_database(#     user_id INT REFERENCES users(user_id),
construction_app_database(#     title VARCHAR(255) NOT NULL,
construction_app_database(#     description TEXT NOT NULL,
construction_app_database(#     location VARCHAR(255) NOT NULL,
construction_app_database(#     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
construction_app_database(#     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
construction_app_database(# );
CREATE TABLE
construction_app_database=#
construction_app_database=# -- Create CompanyProfiles Table
construction_app_database=# CREATE TABLE company_profiles (
construction_app_database(#     company_id SERIAL PRIMARY KEY,
construction_app_database(#     user_id INT REFERENCES users(user_id),
construction_app_database(#     company_name VARCHAR(255) NOT NULL,
construction_app_database(#     description TEXT,
construction_app_database(#     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
construction_app_database(#     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
construction_app_database(# );
CREATE TABLE
construction_app_database=#
construction_app_database=# -- Create Applications Table
construction_app_database=# CREATE TABLE applications (
construction_app_database(#     application_id SERIAL PRIMARY KEY,
construction_app_database(#     job_advert_id INT REFERENCES job_adverts(job_advert_id),
construction_app_database(#     user_id INT REFERENCES users(user_id),
construction_app_database(#     status VARCHAR(50),
construction_app_database(#     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
construction_app_database(#     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
construction_app_database(# );
CREATE TABLE
construction_app_database=#
construction_app_database=# -- Create ChatMessages Table
construction_app_database=# CREATE TABLE chat_messages (
construction_app_database(#     message_id SERIAL PRIMARY KEY,
construction_app_database(#     sender_id INT REFERENCES users(user_id),
construction_app_database(#     receiver_id INT REFERENCES users(user_id),
construction_app_database(#     message TEXT NOT NULL,
construction_app_database(#     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
construction_app_database(# );
CREATE TABLE
construction_app_database=#
construction_app_database=# -- Create Payments Table
construction_app_database=# CREATE TABLE payments (
construction_app_database(#     payment_id SERIAL PRIMARY KEY,
construction_app_database(#     user_id INT REFERENCES users(user_id),
construction_app_database(#     amount DECIMAL(10, 2) NOT NULL,
construction_app_database(#     payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
construction_app_database(#     status VARCHAR(50)
construction_app_database(# );
CREATE TABLE