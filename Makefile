CLIENT=$(shell find client -iname '*.ts' -or -iname '*.tsx' -or -iname '*.scss')
STATIC=$(shell find static -type f -not -name '.*')

# convert

FILENAME=uwp.js
DEV_FILE=build/development/$(FILENAME)
PROD_FILE=build/production/$(FILENAME)

# phony stuff

all: production

production: $(PROD_FILE)
development: $(DEV_FILE)

# actual work

node_modules: package.json
	npm install
	touch node_modules

clean:
	rm -rf dist build node_modules

dist: production Makefile
	@mkdir -p dist/js
	cp $(PROD_FILE) $(PROD_FILE).map dist/js
	cp -a static/* dist/
	find dist/ -type f ! -name '*.gz' -exec gzip -fk "{}" \;

$(DEV_FILE): $(CLIENT) $(STATIC) node_modules Makefile webpack.config.js .babelrc
	node_modules/.bin/webpack --env development

$(PROD_FILE): $(CLIENT) $(STATIC) node_modules Makefile webpack.config.js .babelrc
	node_modules/.bin/webpack --env production

serve: node_modules
	node_modules/.bin/webpack-dev-server --env development

FORCE:

.PHONY: all dist production development client serve
.DELETE_ON_ERROR:

