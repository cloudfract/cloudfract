$(function() {
	window.setInterval(function() {
		refresh_fractal_list();
	}, 10000);

	$("#link-refresh").click(function(e) {
		refresh_fractal_list();
		e.preventDefault();
	});

	$("#btn-generate-fractal").click(function(e) {
		create_fractal( $("#form-generate-fractal").serializeObject() );
		e.preventDefault();
	});

	refresh_fractal_list();
});

function refresh_fractal_list() {
	$("#link-refresh > i").removeClass("text-success text-warning");
	$("#link-refresh > i").addClass("fa-spin");
	fetch_fractal_list();
}

function fetch_fractal_list() {
	$.ajax({
		url: "/fractals",
		type: "GET",
		dataType : "json",
    	success: handle_fetch_success,
    	error: handle_fetch_error,
    	complete: handle_fetch_complete
	});
}

function handle_fetch_success( json ) {
	update_fractal_items($("#fractal-list"), json);
	$("#link-refresh > i").addClass("text-success");
}

function handle_fetch_error( xhr, status ) {
	$("#link-refresh > i").addClass("text-warning");
}

function handle_fetch_complete( xhr, status ) {
	$("#link-refresh > i").removeClass("fa-spin");
}

function update_fractal_items( parent, json ) {
	var items_to_remove = parent.find("[id^=fractal-id]");
	json.fractals.forEach(function(element, index, array) {
		populate_fractal(parent, element);
		items_to_remove.remove("[id^=fractal-id-" + element.id + "]");
	});
	$(items_to_remove).remove();
}

function populate_fractal( parent, fractal ) {
	var template_existing = $("#fractal-id-" + fractal.id),
		template_active = $("#fractal-template-active").clone(),
		template_error = $("#fractal-template-error").clone(),
		template_working = $("#fractal-template-working").clone(),
		template, title, metadata
	;

	switch (fractal.state) {
		case "active":
			template = $("#fractal-template-active").clone();
			break;
		case "error":
			template = $("#fractal-template-error").clone();
			break;
		default:
			template = $("#fractal-template-working").clone();
			break;
	}

	template.attr("id", "fractal-id-" + fractal.id);
	template.removeClass("hidden");

	template.find(".panel-title").html(fractal.name);
	template.find(".fractal-metadata > small").html("Created " + fractal.created);
	template.find(".progress-bar").attr("style", "width: " + fractal.progress + "%" );

	if (template_existing.length) {
		template_existing.html(template.html());
	} else {
		template.prependTo(parent);
	}

	return template;
}

function create_fractal( fractal ) {
	$.ajax({
		url: "/fractals",
		type: "POST",
		data: JSON.stringify({ fractal : fractal }),
		contentType: "application/json; charset=utf-8",
		dataType : "json",
    	success: handle_create_success,
    	error: handle_create_error,
    	complete: handle_create_complete
	});
}

function handle_create_success( json ) {
	populate_fractal($("#fractal-list"), json.fractal);
	$("#modal-generate-fractal").modal('hide');
}

function handle_create_error( xhr, status ) {
	alert("Error: " + status);
}

function handle_create_complete( xhr, status ) {

}

$.fn.serializeObject = function() {
	var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};
