#!/bin/bash

# Substitua pelo seu nome de usuário e repositório
USER="zanfranceschi"
REPO="rinha-de-backend-2024-q1"

# Obtenha o último commit
LAST_COMMIT=$(curl -s "https://api.github.com/repos/$USER/$REPO/commits" | grep sha | head -n 1 | cut -d '"' -f 4)

# Verifique se o arquivo 'last_commit' existe
if [ ! -f "last_commit" ]; then
    echo "Arquivo 'last_commit' não encontrado. Criando um..."
    echo $LAST_COMMIT > last_commit
fi

# Compare o último commit com o anterior
if [ "$LAST_COMMIT" != "$(cat last_commit)" ]; then
    echo "Novo commit detectado: $LAST_COMMIT"
    echo $LAST_COMMIT > last_commit
else
    echo "Nenhum novo commit detectado."
fi
