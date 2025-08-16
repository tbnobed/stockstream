#!/bin/bash

# Fix Docker permissions and group membership

echo "🔧 Fixing Docker permissions..."

# Add current user to docker group if not already added
if ! groups $USER | grep -q '\bdocker\b'; then
    echo "➕ Adding $USER to docker group..."
    sudo usermod -aG docker $USER
    echo "✅ User added to docker group."
    echo ""
    echo "⚠️  IMPORTANT: You need to log out and back in for this to take effect."
    echo "    Alternatively, run: newgrp docker"
    echo ""
    echo "🔄 For immediate effect without logout, run:"
    echo "    newgrp docker"
    echo "    Then re-run: ./scripts/deploy.sh"
else
    echo "✅ User is already in docker group."
fi

# Check Docker service status
if ! systemctl is-active --quiet docker; then
    echo "🚀 Starting Docker service..."
    sudo systemctl start docker
    sudo systemctl enable docker
fi

echo "✅ Docker permissions configured."
echo ""
echo "📋 Next steps:"
echo "   1. Log out and back in (or run: newgrp docker)"
echo "   2. Run: ./scripts/deploy.sh"