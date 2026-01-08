/********************************************************************
 * 06_ui_render.js
 *
 * RENDERY UI — FINAL (PUBLIC GIS)
 ********************************************************************/

function _renderTemplate_(name, params = {}) {
  const tmpl = HtmlService.createTemplateFromFile(name);
  Object.keys(params).forEach(k => (tmpl[k] = params[k]));
  return tmpl.evaluate().setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL
  );
}

/********************************************************************
 * APP SHELL (START)
 ********************************************************************/
function render_app_shell(params = {}) {
  // client_id do Google Identity Services
  params.clientId = AUTH_GOOGLE_CLIENT_ID_WEB;
  return _renderTemplate_("ui_app_shell", params);
}

/********************************************************************
 * REGISTER
 ********************************************************************/
function render_register(params = {}) {
  return _renderTemplate_("ui_register", params);
}

/********************************************************************
 * HOME
 ********************************************************************/
function render_home(params = {}) {
  return _renderTemplate_("ui_home", params);
}

/********************************************************************
 * ARCHIVED
 ********************************************************************/
function render_archived(params = {}) {
  return _renderTemplate_("ui_archived", params);
}

/********************************************************************
 * NO ACCESS
 ********************************************************************/
function render_no_access(params = {}) {
  return _renderTemplate_("ui_no_access", params);
}

/********************************************************************
 * REGISTER SUCCESS (zostawiamy dla kompatybilności)
 ********************************************************************/
function render_register_success(params = {}) {
  return _renderTemplate_("ui_register_success", params);
}
