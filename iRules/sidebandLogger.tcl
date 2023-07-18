when RULE_INIT priority 900 {
	# Log debug locally to /var/log/ltm? 1=yes, 0=no
	set static::f5_api_hsl_debug 1
	# Pool name to post the API activity data to
	set static::f5_api_hsl_pool "/Common/f5_api-collector-pool"
	# Maximum payload size
	set static::f5_api_max_payload 102400
}

when CLIENT_ACCEPTED priority 900 {
	set requestTime [clock clicks -milliseconds]
	if {[active_members $static::f5_api_hsl_pool]==0} {
		log local0. "[IP::client_addr]:[TCP::client_port]: [virtual name] $static::f5_api_hsl_pool down, not logging"
		set bypass 1
	} else {
		set bypass 0
		# Open a new HSL connection if one is not available
		set hsl [HSL::open -proto TCP -pool $static::f5_api_hsl_pool]
		if {$static::f5_api_hsl_debug} {log local0. "[IP::client_addr]:[TCP::client_port]: New hsl handle: $hsl"}
		IP::protocol
	}
}

when HTTP_REQUEST priority 900 {
	# If the HSL pool is down, do not run more code here
	if { not ($bypass) && not ([HTTP::has_responded]) } {
		if { [HTTP::header exists "Accept-Encoding"]} {
			HTTP::header remove Accept-Encoding
		}

		set reqJsonArrayStr "\{"
		foreach headerName [HTTP::header names] {
			if { [ string tolower $headerName ] equals "authorization" } {
				log local0. "Auth: [URI::encode [substr [HTTP::header value $headerName] 0 " " ] ]"
				append reqJsonArrayStr "\"$headerName\": \"[URI::encode [substr [HTTP::header value $headerName] 0 " " ] ]\","
			} else {

				append reqJsonArrayStr "\"$headerName\": \"[URI::encode [HTTP::header value $headerName]]\","
			}
		}
		set reqJsonArrayStr [string trimright $reqJsonArrayStr ,]
		append reqJsonArrayStr "\}"

		set http_request [HTTP::request]
		set req_data(payload) ""
		set req_data(headers) $reqJsonArrayStr
		set req_data(method) \"[HTTP::method]\"
		set req_data(uri) \"[HTTP::uri]\"
		# Check for POST/PATCH/PUT requests
		if {[HTTP::method] eq "POST" || [HTTP::method] eq "PATCH" || [HTTP::method] eq "PUT" } {
			set collectsize [HTTP::payload length]

			if { [HTTP::payload length] > $static::f5_api_max_payload } {
				set collectsize $static::f5_api_max_payload
			}

			if { [ catch { HTTP::collect $collectsize } ] } {
				log local0. "Error collecting request payload"
			}
		}
	}
}

when HTTP_REQUEST_DATA priority 900 {
	if { not ($bypass) } {
		if {[HTTP::payload length] > 0} {
			if { [HTTP::payload] > $static::f5_api_max_payload } {
				set req_data(payload) $static::f5_api_max_payload
			} else {
				set req_data(payload) [HTTP::payload]
			}
		}
	}
}

when HTTP_RESPONSE priority 900 {
	if { not ($bypass) } {
		if { ([HTTP::header exists "Transfer-Encoding"]) && ([HTTP::header "Transfer-Encoding"] eq "chunked") } {
			# Response is chunked. Collect minimal amount of data so "HTTP_RESPONSE_DATA" event gets call
			set res_chunked 1

			if { [HTTP::header exists "Content-Length"] } {
				if { [HTTP::header "Content-Length"] > $static::f5_api_max_payload }{
					set collectsize $static::f5_api_max_payload
				} else {
					set collectsize [HTTP::header "Content-Length"]

				}
			} else {
				set collectsize 0
			}
			if { [ catch { HTTP::collect $collectsize } ] } {
				log local0. "Error collecting chunked response payload"
				# log local0. "Request: $req_data"
			}
		} else {
			set res_chunked 0
			set collectsize [HTTP::header "Content-Length"]
			if { [HTTP::header "Content-Length"] > $static::f5_api_max_payload }{
				set collectsize $static::f5_api_max_payload
			}

			if { [ catch { HTTP::collect $collectsize } ] } {
				log local0. "Error collecting response payload"
				# log local0. "Request: $req_data"
			}
		}
	}
}

when HTTP_RESPONSE_DATA priority 900 {
	if { not ($bypass) } {
		# Formatting HTTP request data
		set req_data_msg "\"headers\": $req_data(headers), \
			\"virtualServerName\": \"[URI::encode [virtual name] ]\", \
			\"method\": $req_data(method), \
			\"requestTimestamp\": $requestTime, \
			\"uri\": $req_data(uri)"

		if { [string length $req_data(payload)] > 0 } {
			set req_data_msg [ concat $req_data_msg ",\"payload\": \"[URI::encode $req_data(payload)]\"" ]
		}
		set req_data_msg [ concat "\"request\": { $req_data_msg }" ]

		# Formatting HTTP response data
		set resJsonArrayStr "\{"
		foreach headerName [HTTP::header names] {
			set headerValue [URI::encode [HTTP::header value $headerName]]
			
			if { [class match $headerName equals protected_fields ] } {
				set headerValue  [class match -value $headerName equals protected_fields ]
			} 
			append resJsonArrayStr "\"$headerName\": \"$headerValue\","
		}
		set resJsonArrayStr [string trimright $resJsonArrayStr ,]
		append resJsonArrayStr "\}"

		set res_data_msg "\"headers\": $resJsonArrayStr, \
			\"responseTimestamp\": [clock clicks -milliseconds], \
			\"status\": [HTTP::status]"

		if {not $res_chunked} {
			set res_data_msg [ concat $res_data_msg ",\"payload\": \"[URI::encode [HTTP::payload] ]\"" ]
		}
		set res_data_msg [ concat "\"response\": { $res_data_msg }" ]

		# set res_data_msg "\"response\":\"\""
		log local0. "Sending: {$req_data_msg, $res_data_msg}"
		HSL::send $hsl "[URI::encode "{$req_data_msg, $res_data_msg}"] \n\n"
		# URI Encode the whole message to ensure message sent as single log event
		# if { [ catch { HSL::send $hsl "[URI::encode "{$req_data_msg, $res_data_msg}"] \n\n" } ] } {
		# 	log local0. "Error sending data to HSL"
		# }
	}
}

when HTTP_RESPONSE_RELEASE priority 900 {
	if { [info exists req_data] } { unset req_data }
	if { [info exists req_data_msg] } { unset req_data_msg }
	if { [info exists res_data_msg] } { unset res_data_msg }
	if { [info exists resJsonArrayStr] } { unset resJsonArrayStr }
	if { [info exists reqJsonArrayStr] } { unset reqJsonArrayStr }
}