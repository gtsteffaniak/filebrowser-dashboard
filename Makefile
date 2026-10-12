# FileBrowser Analytics Dashboard
ifeq ($(OS),Windows_NT)
    SHELL := C:/Program Files/Git/bin/bash.exe
    .SHELLFLAGS := -ec
else
    SHELL := /bin/bash
endif

.DEFAULT_GOAL := help

NODE_MODULES := node_modules
DIST := dist

.PHONY: help setup dev build preview clean check install

help: ## Show this help
	@echo "FileBrowser Analytics Dashboard"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@grep -E '^[a-zA-Z0-9_.-]+:.*##' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: install ## Install deps
	@echo "✓ Setup complete — run: make dev"

install: $(NODE_MODULES) ## npm install

$(NODE_MODULES): package.json
	npm install

dev: install ## Dev server (loads the public API data)
	npm run dev

build: install check ## Production build to dist/
	npm run build
	@echo "✓ Built to $(DIST)/"

preview: build ## Serve production build on http://localhost:5173
	npm run preview

check: install ## Typecheck without emitting
	npx tsc --noEmit

clean: ## Remove node_modules and dist/
	rm -rf $(NODE_MODULES) $(DIST)
	@echo "✓ Cleaned $(NODE_MODULES) and $(DIST)"
