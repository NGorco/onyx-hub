# Stage 1: Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Build F# backend
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend
WORKDIR /src
COPY idpai.fsproj .
COPY Protos/Protos.csproj Protos/
RUN dotnet restore
COPY . .
COPY --from=frontend /app/wwwroot ./wwwroot
RUN dotnet publish -c Release -o /app

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=backend /app .

# Default plugins dir inside the container — mount external plugins here
ENV PLUGINS_DIR=/plugins
ENV ASPNETCORE_URLS=http://+:8080

EXPOSE 8080

ENTRYPOINT ["dotnet", "idpai.dll"]
