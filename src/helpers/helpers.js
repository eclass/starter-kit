'use strict';

// Handlebars
var handlebars = require('handlebars');
var layouts = require('handlebars-layouts');

// assetPath
handlebars.registerHelper('assetPath', function(path, context) {
	return [context.data.root.rev[path]].join('/');
});

// Make handlebars layout helpers available
handlebars.registerHelper(layouts(handlebars));
