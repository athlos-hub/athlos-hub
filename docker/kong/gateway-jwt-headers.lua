-- Injeta claims do JWT já validado pelo plugin jwt (RS256 / Keycloak).
-- Não remove Authorization: os serviços podem repassar o Bearer para outros microsserviços
-- sem revalidar a assinatura (validação ocorre apenas aqui no Kong).
local token = kong.ctx.shared.authenticated_jwt_token
if not token or type(token) ~= "string" then
  return
end
local parts = {}
for part in string.gmatch(token, "[^%.]+") do
  table.insert(parts, part)
end
if #parts < 2 then
  return
end
local payload_b64 = parts[2]
local pad = 4 - (#payload_b64 % 4)
if pad ~= 4 then
  payload_b64 = payload_b64 .. string.rep("=", pad)
end
payload_b64 = payload_b64:gsub("-", "+"):gsub("_", "/")
local raw = ngx.decode_base64(payload_b64)
if not raw then
  return
end
local cjson = require("cjson.safe")
local claims = cjson.decode(raw)
if not claims or type(claims) ~= "table" then
  return
end
if claims.sub then
  kong.service.request.set_header("X-Keycloak-Sub", tostring(claims.sub))
end
if claims.email then
  kong.service.request.set_header("X-Keycloak-Email", tostring(claims.email))
end
if claims.preferred_username then
  kong.service.request.set_header("X-Keycloak-Preferred-Username", tostring(claims.preferred_username))
end
local ra = claims.realm_access
if ra and type(ra) == "table" and ra.roles and type(ra.roles) == "table" then
  kong.service.request.set_header("X-Keycloak-Roles", table.concat(ra.roles, ","))
end
