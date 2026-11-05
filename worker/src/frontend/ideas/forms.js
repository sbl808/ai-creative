import { IDEA_CATEGORIES } from './categories.js';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderIdeaCategoryOptions(selected = 'story') {
  return IDEA_CATEGORIES.map((category) =>
    '<option value="' + escapeHtml(category.id) + '"' +
    (category.id === selected ? ' selected' : '') + '>' +
    escapeHtml(category.label) + '</option>'
  ).join('');
}

export function ideaFormsScript() {
  return String.raw`<script>
(function () {
  'use strict';
  var categories = ${JSON.stringify(IDEA_CATEGORIES)};
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function renderField(field) {
    var id = escapeHtml(field.id);
    var label = escapeHtml(field.label);
    var required = field.required ? ' required' : '';
    var placeholder = escapeHtml(field.placeholder || '');
    var control;
    if (field.type === 'select') {
      control = '<select id="' + id + '"' + required + '>' +
        (field.required ? '' : '<option value="">မရွေးရသေးပါ</option>') +
        (field.options || []).map(function (option) {
          return '<option value="' + escapeHtml(option) + '">' + escapeHtml(option) + '</option>';
        }).join('') + '</select>';
    } else if (field.type === 'textarea') {
      control = '<textarea id="' + id + '" maxlength="2000"' + required +
        ' placeholder="' + placeholder + '"></textarea>';
    } else {
      control = '<input id="' + id + '" type="text" maxlength="2000"' + required +
        ' placeholder="' + placeholder + '"' +
        (field.defaultValue ? ' value="' + escapeHtml(field.defaultValue) + '"' : '') + '>';
    }
    return '<div class="field' + (field.type === 'textarea' ? ' full' : '') + '">' +
      '<label for="' + id + '">' + label + (field.required ? ' *' : '') + '</label>' +
      control + '</div>';
  }
  function mount(container, categoryId) {
    var category = categories.find(function (item) { return item.id === categoryId; }) || categories[0];
    if (!container) return;
    container.innerHTML = '<p class="muted small">' + escapeHtml(category.description) + '</p>' +
      '<div class="grid">' + category.fields.map(renderField).join('') + '</div>';
  }
  function read(categoryId) {
    var category = categories.find(function (item) { return item.id === categoryId; }) || categories[0];
    var values = {};
    category.fields.forEach(function (field) {
      var input = document.getElementById(field.id);
      values[field.id] = input ? String(input.value || '').trim() : '';
    });
    return values;
  }
  function validate(categoryId) {
    var category = categories.find(function (item) { return item.id === categoryId; }) || categories[0];
    for (var i = 0; i < category.fields.length; i++) {
      var field = category.fields[i];
      var input = document.getElementById(field.id);
      if (field.required && (!input || !String(input.value || '').trim())) {
        if (input) input.focus();
        return { ok: false, field: field.id, label: field.label };
      }
    }
    return { ok: true };
  }
  window.AICS_IDEA_FORMS = {
    categories: categories,
    mount: mount,
    read: read,
    validate: validate
  };
})();
</script>`;
}
