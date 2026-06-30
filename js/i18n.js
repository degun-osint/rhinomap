/**
 * Internationalization (i18n) system for RhinoMap
 * Supports multiple languages with easy switching
 */

const translations = {
    en: {
        // General
        app_name: "RhinoMap",
        loading: "Loading...",
        error: "Error",
        success: "Success",
        cancel: "Cancel",
        delete: "Delete",
        save: "Save",
        close: "Close",
        edit: "Edit",
        view: "View",
        execute: "Execute",
        generate: "Generate",
        change_icon: "Change Icon",
        icon_changed_successfully: "Icon changed successfully",
        choose_icon: "Choose an icon",
        search_icons: "Search icons...",
        toggle_line_measurements: "Toggle Measurements",
        toggle_legend: "Toggle Area Info",
        copy_coordinates: "Copy coordinates",
        click_name_to_rename: "Click on name to rename",
        coordinates_copied: "Coordinates copied!",

        // Authentication
        auth_login: "Login",
        auth_logout: "Logout",
        auth_register: "Register",
        auth_username: "Username",
        auth_password: "Password",
        auth_email: "Email",
        auth_tokens: "Tokens",
        auth_profile: "Profile",
        auth_admin: "Admin",

        // Navigation
        map: "Map",
        documentation: "Documentation",
        my_account: "My Account",
        buy_tokens: "Buy Tokens",
        login: "Login",
        register: "Register",
        logout: "Logout",
        tokens: "tokens",

        // Footer
        made_with: "Made with",
        by: "by",
        privacy_notice: "Privacy First",
        privacy_local_storage: "All your data is stored locally in your browser.",
        privacy_no_logs: "No server logs except for shared maps.",
        privacy_banner_close: "Close privacy notice",

        // Menu
        menu_file: "File",
        menu_export_json: "Export JSON (complete map with layers for reimport)",
        menu_export_geojson: "Export GeoJSON",
        menu_export_csv: "Export CSV",
        menu_export_kml: "Export KML",
        export_image_title: "Export as Image",
        export_image_description: "Download your map as a PNG image with optional legend",
        export_image_button: "Export Image",
        export_image_title_field: "Map Title",
        export_image_size: "Image Size",
        export_image_width: "Width (px)",
        export_image_height: "Height (px)",
        export_image_include_legend: "Include layers legend",
        export_image_download: "Download",
        export_image_generating: "Generating image...",
        export_image_success: "Image exported successfully!",
        export_image_error: "Error exporting image",
        export_image_library_missing: "html2canvas library not loaded",
        performance_warning_500_elements: "500 elements on map — performance may decrease",
        performance_warning_1000_elements: "1000 elements — consider removing unused layers for better performance",
        menu_import: "Import JSON",
        menu_clear: "Clear all",

        // Toolbar tooltips
        tool_select: "Select",
        pan_tool: "Pan Map",
        pan_tool_desc: "Navigate and interact with the map",
        toggle_layers_panel: "Toggle Layers Panel",
        layers_panel_title: "Layers",
        tool_point: "Add Point",
        tool_line: "Draw Line",
        tool_circle: "Draw Circle",
        tool_polygon: "Draw Polygon",
        tool_measure: "Measure",
        tool_isochrone: "Isochrones",
        tool_overpass: "Overpass Queries",
        tool_image_analysis: "Image Analysis",

        // Layers
        layers_title: "Layers",
        layers_add: "Add Layer",
        layers_default: "Default Layer",
        layers_rename: "Rename Layer",
        layers_delete: "Delete Layer",
        layers_show: "Show",
        layers_hide: "Hide",
        layers_color: "Color",
        layers_toggle_all_labels: "Toggle All Labels",
        layers_all_labels_shown: "All labels shown in layer \"{name}\"",
        layers_all_labels_hidden: "All labels hidden in layer \"{name}\"",

        // Elements
        element_point: "Point",
        element_line: "Line",
        element_circle: "Circle",
        element_polygon: "Polygon",
        element_isochrone: "Isochrone",
        element_overpass: "Overpass Query",
        element_image_analysis: "Image Analysis",
        element_move_to_layer: "Move to Layer",
        element_toggle_visibility: "Toggle element visibility",

        // Measurements
        radius: "Radius",
        area: "Area",
        circle: "Circle",
        circle_resized: "Circle resized",

        // Search
        search_placeholder: "Search location...",
        search_button: "Search",
        search_no_results: "No results found",
        search_gps_coordinates: "GPS Coordinates",
        search_gps_found: "Navigated to GPS coordinates",

        // Map context menu
        ctx_add_point: "Add point here",
        ctx_start_line: "Start line here",
        ctx_start_circle: "Start circle here",
        ctx_start_polygon: "Start polygon here",
        ctx_calc_isochrone: "Calculate isochrone",
        point_created: "Point created",
        line_started: "Line started - click to add points",
        circle_started: "Circle started - click to set radius",
        polygon_started: "Polygon started - click to add vertices",
        coordinates_copied: "Coordinates copied",
        copy_failed: "Failed to copy",

        // Overpass
        overpass_title: "Overpass Queries",
        overpass_new_query: "New Query",
        overpass_zone_type: "Zone Type",
        overpass_zone_visible: "Visible map area",
        overpass_zone_manual: "Manual location",
        overpass_zone_existing: "Use existing element",
        overpass_zone_placeholder: "e.g., Paris, Lyon...",
        overpass_select_element: "Select an element...",
        overpass_select_zone_help: "Choose a zone, circle or polygon from your layers",
        overpass_items: "Items to Search",
        overpass_filters: "Filters:",
        overpass_add_item: "Add Item",
        overpass_item: "Item",
        overpass_item_label: "Label",
        overpass_item_tags: "OSM Tags",
        overpass_display: "Display",
        overpass_color: "Color",
        overpass_distance: "Max Distance",
        overpass_reference: "From",
        overpass_generating: "Generating query...",
        overpass_executing: "Executing...",
        overpass_executing_api: "Executing Overpass API request...",
        overpass_query_success: "Query executed successfully",
        overpass_elements_found: "element(s) displayed on map",
        overpass_explanation: "Explanation:",
        overpass_warnings: "Warnings:",
        overpass_no_suggestions: "No particular suggestions.",
        overpass_save_layer: "Save as Layer",
        overpass_layer_name: "Layer Name",
        overpass_code_editor: "Overpass QL Code",
        overpass_comments: "Claude's Comments",
        overpass_what_to_search: "What to search?",
        overpass_example_placeholder: "Ex: Restaurants, Schools...",
        overpass_distance_from: "📏 Distance from:",
        overpass_distance_meters: "Distance (m)",
        overpass_distance_example: "Ex: Restaurants within 500m of schools",
        overpass_query_empty: "Please enter an Overpass query",
        overpass_chat_welcome: "Describe what you're looking for on the map. I'll generate the Overpass query for you.",
        overpass_chat_placeholder: "Describe what to search...",
        overpass_chat_show_query: "Show query",
        overpass_chat_query_generated: "Query generated!",
        overpass_chat_new_conversation: "New conversation",
        overpass_chat_tokens_per_msg: "tokens per message",
        overpass_chat_free_message: "No tokens used",
        overpass_chat_off_topic: "Off-topic — tokens consumed",
        overpass_chat_too_short: "Please describe what you're looking for on the map.",
        overpass_saved_to_layers: "saved to layers",
        overpass_chat_copy_query: "Copy",
        overpass_chat_edit_query: "Edit & Replay",
        overpass_chat_copied: "Query copied to clipboard",
        executing: "Executing...",
        query_executed_success: "Query executed successfully",
        elements_displayed: "element(s) displayed on map",
        query_auto_corrected: "Query was automatically corrected",
        correction_attempts: "Correction attempts",
        execution_error: "Execution error",
        execute_query: "Execute Query",
        no_query_to_save: "No query to save",
        query_name: "Query name:",
        query_saved: "Query saved successfully",
        cannot_save_query: "Cannot save query - LayersManager not available",
        code_copied: "Code copied to clipboard",
        copy_failed: "Failed to copy code",

        // Image Analysis
        image_analysis_title: "Image Analysis",
        image_analysis_upload: "Upload Image",
        image_analysis_drag_drop: "Drag & drop or click to select",
        image_analysis_context: "Additional Context (optional)",
        image_analysis_context_placeholder: "Describe what you know about this location...",
        image_analysis_analyzing: "Analyzing image...",
        image_analysis_cost: "Cost:",
        image_analysis_tokens: "tokens",
        image_analysis_confidence: "Confidence:",
        image_analysis_execution_time: "Execution time:",
        image_analysis_analysis: "Analysis",
        image_analysis_elements: "Identified Elements",
        image_analysis_locations: "Suggested Locations",
        image_analysis_zones: "Search Zones",
        image_analysis_show_zones: "Show Zones on Map",
        image_analysis_exif: "EXIF Data",
        image_analysis_gps: "GPS Coordinates",
        image_analysis_no_gps: "No GPS data",
        image_analysis_camera: "Camera",
        image_analysis_datetime: "Date & Time",
        image_analysis_history: "AI Search History",
        image_analysis_no_history: "No search history yet",
        image_analysis_view_details: "View Details",
        image_analysis_delete_history: "Delete",

        // Errors
        error_fetch: "Error fetching data",
        error_auth: "Authentication error",
        error_tokens: "Insufficient tokens",
        error_upload: "Upload error",
        error_file_size: "File too large. Maximum size:",
        error_map_not_ready: "Map is not initialized yet",
        error_overpass: "Error executing Overpass query:",
        error_generation: "Error generating query:",
        error_no_query: "No query to open",
        error_must_login: "You must be logged in",
        error_must_login_for_overpass: "You must be logged in to execute Overpass queries (free for all users)",
        error_must_login_for_export: "You must be logged in to export maps as images (free for all users)",
        error_change_icon: "Failed to change icon",
        premium_feature_locked: "Premium Feature",
        premium_feature_login_required: "Please log in to use this feature",
        please_login: "Please Log In",
        legend: "Legend",
        export_image_quality: "Image Quality",
        export_quality_low: "Low (1x current size)",
        export_quality_medium: "Medium (2x current size)",
        export_quality_high: "High (3x current size)",
        error_select_image: "Please select an image",
        error_invalid_image: "Please select a valid image file",
        error_insufficient_tokens_cost: "Insufficient tokens. This feature costs",
        error_file_format: "Unrecognized file format. Use a JSON or GeoJSON file exported from RhinoMap.",
        error_file_load: "Error loading file:",
        error_no_point_selected: "No point selected",
        error_invalid_duration_distance: "Please enter a positive value for duration/distance",
        error_geometry_unsupported: "Unsupported geometry format",
        error_storage_purge: "Error purging localStorage",
        error_layer_creation: "Error creating layer",
        error_connection: "Connection error:",
        error_invalid_credentials: "Invalid credentials",
        error_creating_account: "Error creating account:",
        error_passwords_dont_match: "Passwords do not match",
        session_expired: "Session expired - please log in again",
        error_must_login_feature: "You must be logged in to use this feature",
        error_overpass_manager_not_init: "OverpassManager not initialized",
        error_failed_to_copy: "Failed to copy query",
        error_payment_init: "Payment system not initialized. Please refresh the page.",
        error_payment_failed: "Payment failed. Please try again.",
        error_load_packages: "Failed to load token packages",
        error_loading_page: "Error loading page. Please try again.",

        // Success messages
        success_export: "Export completed",
        success_import: "Import completed",
        success_save: "Saved successfully",
        success_delete: "Deleted successfully",
        success_layer_created: "Layer created",
        success_query_executed: "Query executed",
        success_storage_purged: "localStorage purged! Automatic data has been deleted. Reload the page to start a fresh session.",
        success_login: "Successfully logged in!",
        logout_success: "Successfully logged out",
        success_query_saved: "Query \"{name}\" saved with {count} elements",
        success_copied_to_clipboard: "Query copied to clipboard!",
        success_payment: "Payment successful! Your tokens have been credited to your account.",

        // Email verification
        email_verification_checking: "Checking email verification...",
        email_verified_success: "Email verified successfully! You can now use all features.",
        email_verification_failed: "Email verification failed.",
        email_verification_error: "Email verification error",

        // Password reset
        forgot_password_link: "Forgot password?",
        forgot_password_title: "Forgot Password",
        forgot_password_description: "Enter your email address and we'll send you a link to reset your password.",
        forgot_password_send: "Send Reset Link",
        back_to_login: "← Back to login",
        password_reset_email_sent: "If an account with this email exists, you will receive a password reset link.",
        reset_password_title: "Reset Password",
        reset_password_new: "New Password",
        reset_password_confirm: "Confirm New Password",
        reset_password_submit: "Reset Password",
        password_reset_success: "Password reset successfully! You can now log in with your new password.",
        password_min_length: "Password must be at least 8 characters",

        // Warnings
        warning_payment_cancel: "Payment was canceled. No charges were made.",

        // Payments
        buy_tokens_title: "Buy Tokens",
        back_to_account: "Back to Account",
        payment_checkout: "Checkout",
        buy_now: "Buy Now",
        pay_now: "Pay Now",
        payment_creating: "Creating payment...",
        error_create_payment: "Failed to create payment",
        payment_vat: "VAT",
        payment_total: "Total",
        payment_buy_tokens: "Buy Tokens",
        payment_choose_package: "Choose a token package to continue using premium features",
        payment_secure_stripe: "Secure payment powered by Stripe",
        payment_secure_info: "Your payment information is encrypted and secure",
        payment_vat_info: "VAT is automatically calculated based on your location during checkout",
        payment_redirecting: "Redirecting to secure payment...",
        payment_loading_packages: "Loading packages...",
        payment_no_packages: "No packages available at the moment",
        payment_per_token: "per token",
        payment_price_ttc: "incl. VAT",
        payment_price_ht: "excl. VAT",
        payment_bonus: "bonus",
        payment_popular: "Popular",
        payment_history: "Payment History",
        payment_invoice: "Invoice",
        payment_download_invoice: "Download Invoice",
        payment_no_invoice: "Invoice not available",
        payment_status: "Status",
        payment_date: "Date",
        payment_amount: "Amount",
        payment_package: "Package",
        payment_tokens: "Tokens",
        payment_no_history: "No payment history yet",
        no_payments_yet: "No payments yet",
        download_invoice: "Download",
        view_invoice: "View",
        error_load_payments: "Failed to load payment history",
        payment_status_pending: "Pending",
        payment_status_processing: "Processing",
        payment_status_succeeded: "Succeeded",
        payment_status_failed: "Failed",
        payment_status_canceled: "Canceled",
        payment_status_refunded: "Refunded",
        account_title: "My Account",
        account_email: "Email",
        account_username: "Username",
        account_tokens_balance: "Token Balance",
        account_unlimited_tokens: "Unlimited Tokens",
        account_member_since: "Member Since",
        account_tab_info: "Account Info",
        account_tab_payments: "Payment History",
        account_tab_billing: "Billing Info",
        account_tab_security: "Security",
        back_to_map: "Back to Map",
        billing_info_title: "Billing Information",
        billing_info_description: "This information will be used for invoices. Optional but recommended for business purchases.",
        billing_full_name: "Full Name / Company Name",
        billing_address: "Address",
        billing_postal_code: "Postal Code",
        billing_city: "City",
        billing_country: "Country",
        billing_vat_number: "VAT Number (optional)",
        success_billing_updated: "Billing information updated successfully",
        payment_history_title: "Payment History",
        payment_im_business: "I am a business (with VAT number)",
        payment_business_help: "Check this box to enter an intra-community VAT number",
        payment_tax_auto: "VAT will be calculated automatically based on your country",
        payment_loading: "Loading secure payment...",
        payment_invoice_ready: "Your invoice is available",
        payment_vat_calculated: "+ VAT calculated automatically",
        pay_now: "Pay Now",
        payment_accept_cgv: "I accept the",
        payment_cgv_link: "Terms and Conditions of Sale",

        // Promo Codes
        promo_code_title: "Have a promo code?",
        promo_code: "Promo code",
        promo_code_apply: "Apply",
        promo_code_required: "Please enter a promo code",
        promo_code_valid: "Promo code valid!",
        promo_new_balance: "New balance",
        promo_discount_applied_checkout: "discount will be applied at checkout",
        promo_select_package: "Select a package above to continue",
        processing: "Processing...",

        account_current_password: "Current Password",
        account_new_password: "New Password",
        account_confirm_password: "Confirm New Password",
        account_change_password: "Change Password",
        account_change_email: "Change Email",
        account_new_email: "New Email",
        account_save_changes: "Save Changes",
        success_password_changed: "Password changed successfully",
        success_email_changed: "Email changed successfully",
        error_password_mismatch: "Passwords do not match",
        error_current_password_wrong: "Current password is incorrect",

        // Map Sharing
        share_map_title: "Share Map",
        share_map_button: "Share Map",
        share_map_description: "If you choose to share your map, it will be saved in our database with your username with a code (4 words-numbers) and a URL.",
        share_map_readonly: "Read-Only Sharing",
        share_map_readonly_free: "Free",
        share_map_readonly_description: "Others can view your map but cannot modify it",
        share_map_create: "Create Share",
        share_map_creating: "Creating share...",
        share_map_code: "Share Code",
        share_map_url: "Share URL",
        share_map_copy_url: "Copy URL",
        share_map_copy_code: "Copy Code",
        share_map_url_copied: "URL copied to clipboard!",
        share_map_code_copied: "Code copied to clipboard!",
        share_map_name: "Map Name (optional)",
        share_map_description_field: "Description (optional)",
        share_map_name_placeholder: "e.g., My Custom Map",
        share_map_description_placeholder: "Describe what this map represents...",
        share_map_my_shares: "My Shared Maps",
        share_map_no_shares: "You haven't shared any maps yet",
        share_map_view_count: "views",
        share_map_edit_count: "edits",
        share_map_created: "Created",
        share_map_delete: "Delete Share",
        share_map_delete_confirm: "Delete this shared map?",
        share_map_deleted: "Shared map deleted successfully",
        share_map_max_reached: "You have reached the maximum number of shared maps (5)",
        share_map_loading: "Loading shared map...",
        share_map_not_found: "Shared map not found",
        share_map_readonly_mode: "Read-Only Mode",
        share_map_users_online: "users online",
        share_map_you: "You",
        share_map_anonymous: "Anonymous",
        share_map_user_joined: "joined the map",
        share_map_user_left: "left the map",
        share_map_sync_update: "Map updated by",
        share_map_connection_lost: "Connection lost. Trying to reconnect...",
        share_map_connection_restored: "Connection restored!",
        share_map_open: "Open Shared Map",
        share_map_enter_code: "Enter share code",
        share_map_code_format: "Format: word1-word2-word3-word4",
        share_map_login_required: "Log in to manage your shared maps",
        share_map_clone: "Load data to a new map",
        share_map_clone_tooltip: "Load this map data into your local storage",
        share_map_clone_confirm: "Load this map data into your local storage? This will replace your current map data.",
        share_map_cloned_success: "Map data loaded successfully! Redirecting...",
        share_map_login_prompt: "Would you like to login now?",

        // Authentication errors
        auth_required_message: "Authentication required to access this feature.",
        auth_required_login_prompt: "Would you like to login now?",
        auth_required_cancelled: "Action cancelled. Please login to continue.",

        // Prompts
        prompt_layer_name: "Layer name:",
        prompt_delete_layer: "Delete this layer?",
        prompt_delete_element: "Delete this element?",
        prompt_clear_all: "Clear all data? This cannot be undone.",
        prompt_purge_storage: "Are you sure you want to purge localStorage?<br><br>All automatically saved data will be deleted.<br><br>Currently displayed traces will remain on the map until you reload the page.",
        prompt_delete_point: "Delete point",
        prompt_delete_point_with_structures: "This will affect:",
        prompt_line_with_points: "Line with {count} points",
        prompt_polygon_with_points: "Polygon with {count} points",
        prompt_circle_complete_deletion: "Circle (complete deletion)",
        prompt_delete_query: "Delete query \"{name}\" from history?\n\nLayers created from this query will remain on the map.",
        prompt_delete_query_keep_layer: "Remove \"{name}\" from query history?\n\nThe layer and its {count} elements will remain on the map.",
        remove: "Remove",
        query_removed: "Query \"{name}\" removed from history",
        query_removed_layer_kept: "Query removed. Layer \"{name}\" kept on map.",
        executing_query: "Executing query...",
        query_executed_successfully: "Query executed successfully!",
        no_queries_to_delete: "No queries to delete",
        all_queries_deleted: "All queries deleted from history",
        prompt_delete_all_queries: "Delete all saved queries from history?\n\nLayers will remain on the map.",

        // Warnings
        warning_no_results_to_save: "No results to save",
        warning_add_at_least_one_item: "Please add at least one item to search",
        warning_select_existing_element: "Please select an existing element",
        warning_enter_overpass_query: "Please enter an Overpass query",
        warning_no_query_to_copy: "No query to copy",

        // Misc
        distance_meters: "m",
        distance_kilometers: "km",
        area_square_meters: "m²",
        area_square_kilometers: "km²",
        time_seconds: "s",
        time_minutes: "min",
        coords_latitude: "Latitude",
        coords_longitude: "Longitude",
        coords_altitude: "Altitude",

        // Toolbar tooltips (sidebar)
        toolbar_import_export: "Import/Export Files",
        toolbar_pan_map: "Pan Map (V)",
        toolbar_named_points: "Named Points (P)",
        toolbar_measured_line: "Measured Line (L)",
        toolbar_circle_area: "Circle Area (C)",
        toolbar_polygon_area: "Polygon Area (Shift+P)",
        toolbar_isochrones: "Isochrones (I)",
        toolbar_overpass_ai: "Overpass AI Generator",
        toolbar_image_ai: "Image AI Geolocation",
        toolbar_toggle_layers: "Toggle Layers Panel",
        toolbar_share_map: "Share Map",

        // Files box
        files_title: "Files",
        files_new_layer: "New Layer",
        files_new_layer_tooltip: "Create a new layer",
        files_import: "Import",
        files_import_tooltip: "Import data from file",
        files_export_json: "Export JSON",
        files_export_json_format: "(Rhinomap JSON)",
        files_export_json_tooltip: "Export complete map with layers",
        files_export_geojson: "Export GeoJSON",
        files_export_geojson_tooltip: "Export for GIS software",
        files_export_csv: "Export CSV",
        files_export_csv_tooltip: "Export as CSV",
        files_export_kml: "Export KML",
        files_export_kml_tooltip: "Export as KML",
        files_clear_storage: "Clear Storage",
        files_clear_storage_tooltip: "Clear all local storage",

        // Overpass box
        overpass_box_title: "Overpass Query",
        overpass_tab_ai_label: "AI Assistant",
        overpass_tab_manual_label: "Manual Script",
        overpass_search_area: "Search Area",
        overpass_manual_intro: "Write your custom Overpass QL query below.",
        overpass_learn_syntax: "Learn syntax",
        overpass_custom_query: "Custom Overpass Query",
        overpass_bbox_hint: "Use {{bbox}} for current map bounds",
        overpass_templates: "Quick Templates",
        overpass_select_template: "Select a template...",
        overpass_template_amenity: "Find amenities (cafes, restaurants...)",
        overpass_template_shop: "Find shops",
        overpass_template_roads: "Find roads by type",
        overpass_template_buildings: "Find buildings",
        overpass_template_natural: "Find natural features",
        overpass_template_custom: "Custom template",
        overpass_execute_custom: "Execute Custom Query",
        overpass_turbo: "Turbo",
        overpass_temp_filters_title: "Temporary Results - Filters",
        overpass_save_hint: "Click Save to create layers for each visible element type",
        overpass_saved_queries: "Saved Queries",
        overpass_clear_all: "Clear All Queries",
        overpass_tokens_info: "tokens / message",
        overpass_new_btn: "New",
        overpass_no_zones: "No zones/circles/polygons available",
        overpass_visible_area: "visible map area",

        // Image analysis box
        image_analysis_box_title: "Image Analysis",
        image_analysis_disclaimer_title: "Indicative Analysis",
        image_analysis_disclaimer_text: "AI-powered geolocation provides helpful clues and narrows down search areas, but cannot match the precision of manual research by a specialist. Use results as a starting point for further investigation.",
        image_analysis_select_image: "Select an Image",
        image_analysis_additional_info: "Additional Information (optional)",
        image_analysis_hints_desc: "Add hints to improve accuracy (country, region, date, known landmarks...)",
        image_analysis_context_hint: "e.g., Photo taken in Paris region, near Eiffel Tower. Do not hesitate to mention text, plate number or vehicle use.",
        image_analysis_select_regions: "Select specific regions (max 3)",
        image_analysis_regions_hint: "Draw rectangles on signs, plates, or landmarks for more accurate results",
        image_analysis_selected_regions: "Selected Regions",
        image_analysis_clear_regions: "Clear All",
        image_analysis_analyze_btn: "Analyze (10 tokens)",

        // AI Search History
        ai_history_title: "AI Search History",
        ai_history_empty: "No search history yet",

        // Line Constraints
        line_constraints_title: "Line Constraints",
        line_constraints_segments: "Segments:",
        line_constraints_total: "Total:",
        line_constraints_lock_distance: "Lock Distance",
        line_constraints_meters_placeholder: "meters",
        line_constraints_lock_azimuth: "Lock Azimuth",
        line_constraints_degrees_placeholder: "degrees",
        line_constraints_reset: "Reset",
        line_constraints_finish: "Finish",
        line_constraints_hint1: "add segment",
        line_constraints_hint1_right: "finish",
        line_constraints_hint2_ctrl: "finish",
        line_constraints_hint2_esc: "cancel",

        // Isochrone Settings
        isochrone_settings_title: "Isochrone Settings",
        isochrone_click_to_place: "Click on map to place starting point",
        isochrone_transport_mode: "Transport Mode",
        isochrone_transport_car: "Car",
        isochrone_transport_pedestrian: "Pedestrian",
        isochrone_calc_mode: "Calculation Mode",
        isochrone_calc_time: "Isochrone (time)",
        isochrone_calc_distance: "Isodistance",
        isochrone_direction: "Direction",
        isochrone_direction_from: "From point",
        isochrone_direction_to: "To point",
        isochrone_duration: "Duration",
        isochrone_constraints: "Constraints (avoid)",
        isochrone_avoid_tolls: "Tolls",
        isochrone_avoid_tunnels: "Tunnels",
        isochrone_avoid_bridges: "Bridges",
        isochrone_calculate: "Calculate",
        isochrone_hint1: "place point",
        isochrone_hint1_reclick: "move",
        isochrone_hint2_esc: "cancel",

        // Map controls
        map_view_tooltip: "Map View",
        satellite_view_tooltip: "Satellite View",
        constraints_tool_tooltip: "Drawing Constraints (Ctrl+L)",

        // Search
        search_input_placeholder: "Search for a place...",

        // Point Name Modal
        point_name_modal_title: "Name the Point",
        point_name_placeholder: "Point name",
        modal_confirm: "Confirm",

        // Context menu
        context_edit: "Edit",
        context_color: "Color",

        // Color submenu
        color_title: "Color",
        color_red: "Red",
        color_blue: "Blue",
        color_green: "Green",
        color_orange: "Orange",
        color_purple: "Purple",
        color_pink: "Pink",

        // Login/Register modals
        login_title: "Login",
        login_sign_in: "Sign In",
        register_title: "Create Account",
        register_confirm_password: "Confirm Password",
        register_sign_up: "Sign Up",

        // Icon picker
        icon_picker_title: "Choose an icon",
        icon_picker_search: "Search icons...",

        // Share map extras
        share_map_info_text: "If you choose to share your map, it will be saved anonymously in our database with a unique code and URL.",
        share_map_optional: "optional",
        share_map_success_title: "Success!",
        share_map_untitled: "Untitled Map",
        share_map_readonly_badge: "Read-Only",
        share_map_views: "views",
        share_map_copy_btn: "Copy",
        share_map_open_btn: "Open",
        share_map_update_btn: "Update",
        share_map_update_confirm: "Update shared map with current map data?",
        share_map_updated: "Shared map updated successfully!",
        share_map_update_failed: "Failed to update shared map",
        share_map_no_maps: "No shared maps yet",
        share_map_error_loading: "Error loading shares",
        share_map_not_ready: "Share manager not ready",

        // Export image extras
        export_image_generating_overlay: "Generating image...",
        export_image_title_placeholder: "My Map",

        // Layers sidebar
        layers_close_tooltip: "Close layers panel",
        new_layer: "New Layer",

        // Landing page (index.html)
        // Hero
        index_tagline_1: "Unlock Geolocation Intelligence",
        index_tagline_2: "with AI-Powered Mapping",
        index_subtitle_1: "Transform images into coordinates. Generate complex OSM queries in seconds.",
        index_subtitle_2: "Privacy-first OSINT toolkit.",
        index_start_free: "Start Free Now",
        index_view_pricing: "View Pricing",

        // Card - Free
        index_badge_free: "FREE FOREVER",
        index_essential_toolkit: "Essential Toolkit",
        index_essential_desc: "Everything you need for professional geospatial analysis. No credit card. No time limit.",
        index_feat_named_points: "Named points and markers",
        index_feat_measured_lines: "Measured lines with azimuth",
        index_feat_circular_zones: "Circular zones and polygons",
        index_feat_area_calc: "Area and distance calculations",
        index_feat_isochrones: "Isochrones France (IGN)",
        index_feat_export: "Export JSON/GeoJSON/CSV/KML",
        index_feat_local_storage: "Local storage (privacy-first)",
        index_feat_no_registration: "No registration required",
        index_start_for_free: "Start for free",

        // Card - Premium
        index_badge_ai: "AI-POWERED",
        index_premium_title: "Premium Intelligence",
        index_premium_desc: "Leverage state-of-the-art AI to solve complex geolocation challenges in seconds.",
        index_feat_everything_free: "<strong>Everything in Free, plus:</strong>",
        index_feat_overpass_gen: "🤖 <strong>Overpass QL Generator</strong> - Natural language → OSM queries (5 tokens)",
        index_feat_image_geo: "📸 <strong>Image Geolocation</strong> - AI vision analysis with search zones (10 tokens)",
        index_feat_solve_minutes: "⚡ Solve in minutes what takes hours manually",
        index_feat_spatial_analysis: "🎯 Advanced AI-powered spatial analysis",
        index_feat_no_retention: "🔒 Privacy-first: No data retention",
        index_feat_tokens_never_expire: "💰 Pay-as-you-go, tokens never expire",
        index_try_premium: "Try Premium",

        // Why Choose RhinoMap
        index_why_title: "Why Choose RhinoMap?",
        index_why_subtitle: "The only OSINT mapping platform that combines AI image geolocation with automated Overpass queries — all privacy-first.",
        index_why_privacy_title: "Privacy-First Architecture",
        index_why_privacy_desc: "Your data stays in your browser. No tracking, no retention, no third-party access.",
        index_why_ai_title: "AI-Powered Intelligence",
        index_why_ai_desc: "State-of-the-art AI models for unmatched geolocation accuracy and automated OSM query generation.",
        index_why_fast_title: "10x Faster Workflow",
        index_why_fast_desc: "What takes hours manually (Overpass syntax, image analysis) now takes seconds with natural language.",
        index_why_open_title: "Open & Interoperable",
        index_why_open_desc: "Built on OpenStreetMap. Export to JSON, GeoJSON, CSV, KML. No vendor lock-in.",
        index_why_query_title: "Advanced Query Builder",
        index_why_query_desc: "Generate complex Overpass QL queries from simple descriptions. No syntax knowledge required.",
        index_why_paygo_title: "Pay-As-You-Go",
        index_why_paygo_desc: "No subscriptions. No commitments. Tokens never expire. Stop paying for unused seats.",

        // Pricing
        index_pricing_title: "Simple, Transparent Pricing",
        index_pricing_pay_only: "Pay only for what you use.",
        index_pricing_no_sub: "No subscription.",
        index_pricing_tokens_scale: "Tokens never expire. Start small, scale as needed.",
        index_pricing_loading: "Loading pricing options...",
        index_pricing_note: "All packs include both Overpass generation and image geolocation features",
        index_pricing_no_packages: "No packages available at the moment",
        index_pricing_error: "Error loading pricing. Please refresh the page.",
        index_pricing_best_value: "Best Value",
        index_pricing_get_started: "Get Started",

        // Pack info
        index_pack_try: "Try RhinoMap",
        index_pack_best_value: "Best Value",
        index_pack_pro_power: "Pro Power",
        index_pack_13_analyses: "~13 image analyses",
        index_pack_20_queries: "or ~20 Overpass queries",
        index_pack_get_started: "Perfect to get started",
        index_pack_40_analyses: "~40 image analyses",
        index_pack_80_queries: "or ~80 Overpass queries",
        index_pack_popular: "Most popular choice",
        index_pack_120_analyses: "~120 image analyses",
        index_pack_240_queries: "or ~240 Overpass queries",
        index_pack_intensive: "For intensive users",

        // Auth modal
        index_auth_welcome: "Welcome to RhinoMap",
    },

    fr: {
        // General
        app_name: "RhinoMap",
        loading: "Chargement...",
        error: "Erreur",
        success: "Succès",
        cancel: "Annuler",
        delete: "Supprimer",
        save: "Enregistrer",
        close: "Fermer",
        edit: "Modifier",
        view: "Voir",
        execute: "Exécuter",
        generate: "Générer",
        change_icon: "Changer l'icône",
        icon_changed_successfully: "Icône changée avec succès",
        choose_icon: "Choisir une icône",
        search_icons: "Rechercher des icônes...",
        toggle_line_measurements: "Basculer les mesures",
        toggle_legend: "Afficher/masquer la surface",
        copy_coordinates: "Copier les coordonnées",
        click_name_to_rename: "Clic sur le nom pour renommer",
        coordinates_copied: "Coordonnées copiées !",

        // Authentication
        auth_login: "Connexion",
        auth_logout: "Déconnexion",
        auth_register: "Inscription",
        auth_username: "Nom d'utilisateur",
        auth_password: "Mot de passe",
        auth_email: "Email",
        auth_tokens: "Jetons",
        auth_profile: "Profil",
        auth_admin: "Admin",

        // Navigation
        map: "Carte",
        documentation: "Documentation",
        my_account: "Mon Compte",
        buy_tokens: "Acheter des Jetons",
        login: "Connexion",
        register: "Inscription",
        logout: "Déconnexion",
        tokens: "jetons",

        // Footer
        made_with: "Réalisé avec",
        by: "par",
        privacy_notice: "Confidentialité d'abord",
        privacy_local_storage: "Toutes vos données sont stockées localement dans votre navigateur.",
        privacy_no_logs: "Aucun log serveur sauf pour les cartes partagées.",
        privacy_banner_close: "Fermer le bandeau de confidentialité",

        // Menu
        menu_file: "Fichier",
        menu_export_json: "Exporter JSON (carte complète avec calques pour réimport)",
        menu_export_geojson: "Exporter GeoJSON",
        menu_export_csv: "Exporter CSV",
        menu_export_kml: "Exporter KML",
        export_image_title: "Exporter en image",
        export_image_description: "Téléchargez votre carte en image PNG avec légende optionnelle",
        export_image_button: "Exporter l'image",
        export_image_title_field: "Titre de la carte",
        export_image_size: "Taille de l'image",
        export_image_width: "Largeur (px)",
        export_image_height: "Hauteur (px)",
        export_image_include_legend: "Inclure la légende des calques",
        export_image_download: "Télécharger",
        export_image_generating: "Génération de l'image...",
        export_image_success: "Image exportée avec succès !",
        export_image_error: "Erreur lors de l'export de l'image",
        export_image_library_missing: "Bibliothèque html2canvas non chargée",
        performance_warning_500_elements: "500 éléments sur la carte — les performances peuvent diminuer",
        performance_warning_1000_elements: "1000 éléments — pensez à supprimer les calques inutilisés pour de meilleures performances",
        menu_import: "Importer JSON",
        menu_clear: "Tout effacer",

        // Toolbar tooltips
        tool_select: "Sélectionner",
        pan_tool: "Navigation",
        pan_tool_desc: "Naviguer et interagir avec la carte",
        toggle_layers_panel: "Panneau Calques",
        layers_panel_title: "Calques",
        tool_point: "Ajouter Point",
        tool_line: "Tracer Ligne",
        tool_circle: "Tracer Cercle",
        tool_polygon: "Tracer Polygone",
        tool_measure: "Mesurer",
        tool_isochrone: "Isochrones",
        tool_overpass: "Requêtes Overpass",
        tool_image_analysis: "Analyse d'Image",

        // Layers
        layers_title: "Calques",
        layers_add: "Ajouter Calque",
        layers_default: "Calque par défaut",
        layers_rename: "Renommer Calque",
        layers_delete: "Supprimer Calque",
        layers_show: "Afficher",
        layers_hide: "Masquer",
        layers_color: "Couleur",
        layers_toggle_all_labels: "Basculer tous les labels",
        layers_all_labels_shown: "Tous les labels affichés dans le calque \"{name}\"",
        layers_all_labels_hidden: "Tous les labels masqués dans le calque \"{name}\"",

        // Elements
        element_point: "Point",
        element_line: "Ligne",
        element_circle: "Cercle",
        element_polygon: "Polygone",
        element_isochrone: "Isochrone",
        element_overpass: "Requête Overpass",
        element_image_analysis: "Analyse d'Image",
        element_move_to_layer: "Déplacer vers le calque",
        element_toggle_visibility: "Basculer la visibilité de l'élément",

        // Measurements
        radius: "Rayon",
        area: "Superficie",
        circle: "Cercle",
        circle_resized: "Cercle redimensionné",

        // Search
        search_placeholder: "Rechercher un lieu...",
        search_button: "Rechercher",
        search_no_results: "Aucun résultat trouvé",
        search_gps_coordinates: "Coordonnées GPS",
        search_gps_found: "Navigation vers les coordonnées GPS",

        // Map context menu
        ctx_add_point: "Ajouter un point ici",
        ctx_start_line: "Tracer une ligne ici",
        ctx_start_circle: "Tracer un cercle ici",
        ctx_start_polygon: "Tracer un polygone ici",
        ctx_calc_isochrone: "Calculer un isochrone",
        point_created: "Point créé",
        line_started: "Ligne commencée - cliquez pour ajouter des points",
        circle_started: "Cercle commencé - cliquez pour définir le rayon",
        polygon_started: "Polygone commencé - cliquez pour ajouter des sommets",
        coordinates_copied: "Coordonnées copiées",
        copy_failed: "Échec de la copie",

        // Overpass
        overpass_title: "Requêtes Overpass",
        overpass_new_query: "Nouvelle Requête",
        overpass_zone_type: "Type de Zone",
        overpass_zone_visible: "Zone visible de la carte",
        overpass_zone_manual: "Lieu manuel",
        overpass_zone_existing: "Utiliser élément existant",
        overpass_zone_placeholder: "ex: Paris, Lyon...",
        overpass_select_element: "Sélectionner un élément...",
        overpass_select_zone_help: "Choisir une zone, cercle ou polygone depuis vos calques",
        overpass_items: "Éléments à Rechercher",
        overpass_filters: "Filtres :",
        overpass_add_item: "Ajouter Élément",
        overpass_item: "Élément",
        overpass_item_label: "Label",
        overpass_item_tags: "Tags OSM",
        overpass_display: "Afficher",
        overpass_color: "Couleur",
        overpass_distance: "Distance Max",
        overpass_reference: "Depuis",
        overpass_generating: "Génération de la requête...",
        overpass_executing: "Exécution...",
        overpass_executing_api: "Requête API Overpass en cours...",
        overpass_query_success: "Requête exécutée avec succès",
        overpass_elements_found: "élément(s) affiché(s) sur la carte",
        overpass_explanation: "Explication :",
        overpass_warnings: "Avertissements :",
        overpass_no_suggestions: "Aucune suggestion particulière.",
        overpass_save_layer: "Sauvegarder comme Calque",
        overpass_layer_name: "Nom du Calque",
        overpass_code_editor: "Code Overpass QL",
        overpass_comments: "Commentaires de Claude",
        overpass_what_to_search: "Quoi chercher ?",
        overpass_example_placeholder: "Ex: Restaurants, Écoles...",
        overpass_distance_from: "📏 Distance par rapport à:",
        overpass_distance_meters: "Distance (m)",
        overpass_distance_example: "Ex: Restaurants à 500m des écoles",
        overpass_query_empty: "Veuillez entrer une requête Overpass",
        overpass_chat_welcome: "Décrivez ce que vous cherchez sur la carte. Je génèrerai la requête Overpass pour vous.",
        overpass_chat_placeholder: "Décrivez votre recherche...",
        overpass_chat_show_query: "Voir la requête",
        overpass_chat_query_generated: "Requête générée !",
        overpass_chat_new_conversation: "Nouvelle conversation",
        overpass_chat_tokens_per_msg: "jetons par message",
        overpass_chat_free_message: "Aucun jeton utilise",
        overpass_chat_off_topic: "Hors-sujet — jetons consommes",
        overpass_chat_too_short: "Decrivez ce que vous recherchez sur la carte.",
        overpass_saved_to_layers: "sauvegardé dans les calques",
        overpass_chat_copy_query: "Copier",
        overpass_chat_edit_query: "Modifier & Rejouer",
        overpass_chat_copied: "Requête copiée dans le presse-papier",
        executing: "Exécution...",
        query_executed_success: "Requête exécutée avec succès",
        elements_displayed: "élément(s) affiché(s) sur la carte",
        query_auto_corrected: "La requête a été automatiquement corrigée",
        correction_attempts: "Tentatives de correction",
        execution_error: "Erreur d'exécution",
        execute_query: "Exécuter la requête",
        no_query_to_save: "Aucune requête à sauvegarder",
        query_name: "Nom de la requête :",
        query_saved: "Requête sauvegardée avec succès",
        cannot_save_query: "Impossible de sauvegarder la requête - LayersManager non disponible",
        code_copied: "Code copié dans le presse-papier",
        copy_failed: "Impossible de copier le code",

        // Image Analysis
        image_analysis_title: "Analyse d'Image",
        image_analysis_upload: "Télécharger Image",
        image_analysis_drag_drop: "Glisser-déposer ou cliquer pour sélectionner",
        image_analysis_context: "Contexte Additionnel (optionnel)",
        image_analysis_context_placeholder: "Décrivez ce que vous savez sur ce lieu...",
        image_analysis_analyzing: "Analyse de l'image...",
        image_analysis_cost: "Coût :",
        image_analysis_tokens: "jetons",
        image_analysis_confidence: "Confiance :",
        image_analysis_execution_time: "Temps d'exécution :",
        image_analysis_analysis: "Analyse",
        image_analysis_elements: "Éléments Identifiés",
        image_analysis_locations: "Lieux Suggérés",
        image_analysis_zones: "Zones de Recherche",
        image_analysis_show_zones: "Afficher Zones sur Carte",
        image_analysis_exif: "Données EXIF",
        image_analysis_gps: "Coordonnées GPS",
        image_analysis_no_gps: "Pas de données GPS",
        image_analysis_camera: "Appareil",
        image_analysis_datetime: "Date & Heure",
        image_analysis_history: "Historique Recherches IA",
        image_analysis_no_history: "Aucun historique de recherche",
        image_analysis_view_details: "Voir Détails",
        image_analysis_delete_history: "Supprimer",

        // Errors
        error_fetch: "Erreur lors de la récupération des données",
        error_auth: "Erreur d'authentification",
        error_tokens: "Jetons insuffisants",
        error_upload: "Erreur de téléchargement",
        error_file_size: "Fichier trop volumineux. Taille maximale :",
        error_map_not_ready: "La carte n'est pas encore initialisée",
        error_overpass: "Erreur lors de l'exécution de la requête Overpass :",
        error_generation: "Erreur lors de la génération de la requête :",
        error_no_query: "Aucune requête à ouvrir",
        error_must_login: "Vous devez être connecté",
        error_must_login_for_overpass: "Vous devez être connecté pour exécuter des requêtes Overpass (gratuit pour tous les utilisateurs)",
        error_must_login_for_export: "Vous devez être connecté pour exporter des cartes en image (gratuit pour tous les utilisateurs)",
        error_change_icon: "Échec du changement d'icône",
        premium_feature_locked: "Fonctionnalité Premium",
        premium_feature_login_required: "Veuillez vous connecter pour utiliser cette fonctionnalité",
        please_login: "Veuillez Vous Connecter",
        legend: "Légende",
        export_image_quality: "Qualité de l'image",
        export_quality_low: "Basse (1x taille actuelle)",
        export_quality_medium: "Moyenne (2x taille actuelle)",
        export_quality_high: "Haute (3x taille actuelle)",
        error_select_image: "Veuillez sélectionner une image",
        error_invalid_image: "Veuillez sélectionner un fichier image valide",
        error_insufficient_tokens_cost: "Jetons insuffisants. Cette fonctionnalité coûte",
        error_file_format: "Format de fichier non reconnu. Utilisez un fichier JSON ou GeoJSON exporté depuis RhinoMap.",
        error_file_load: "Erreur lors du chargement du fichier :",
        error_no_point_selected: "Aucun point sélectionné",
        error_invalid_duration_distance: "Veuillez saisir une valeur positive pour la durée/distance",
        error_geometry_unsupported: "Format de géométrie non supporté",
        error_storage_purge: "Erreur lors de la purge du localStorage",
        error_layer_creation: "Erreur lors de la création du layer",
        error_connection: "Erreur de connexion :",
        error_invalid_credentials: "Identifiants invalides",
        error_creating_account: "Erreur lors de la création du compte :",
        error_passwords_dont_match: "Les mots de passe ne correspondent pas",
        session_expired: "Session expirée - veuillez vous reconnecter",
        error_must_login_feature: "Vous devez être connecté pour utiliser cette fonctionnalité",
        error_overpass_manager_not_init: "OverpassManager non initialisé",
        error_failed_to_copy: "Échec de la copie de la requête",
        error_payment_init: "Système de paiement non initialisé. Veuillez actualiser la page.",
        error_payment_failed: "Le paiement a échoué. Veuillez réessayer.",
        error_load_packages: "Impossible de charger les packs de jetons",
        error_loading_page: "Erreur lors du chargement de la page. Veuillez réessayer.",

        // Success messages
        success_export: "Export terminé",
        success_import: "Import terminé",
        success_save: "Sauvegardé avec succès",
        success_delete: "Supprimé avec succès",
        success_layer_created: "Calque créé",
        success_query_executed: "Requête exécutée",
        success_storage_purged: "localStorage purgé ! Les données automatiques ont été supprimées. Rechargez la page pour démarrer une session vierge.",
        success_login: "Connexion réussie !",
        logout_success: "Déconnexion réussie",
        success_query_saved: "Requête \"{name}\" sauvegardée avec {count} éléments",
        success_copied_to_clipboard: "Requête copiée dans le presse-papier !",
        success_payment: "Paiement réussi ! Vos jetons ont été crédités sur votre compte.",

        // Email verification
        email_verification_checking: "Vérification de l'email en cours...",
        email_verified_success: "Email vérifié avec succès ! Vous pouvez maintenant utiliser toutes les fonctionnalités.",
        email_verification_failed: "La vérification de l'email a échoué.",
        email_verification_error: "Erreur lors de la vérification de l'email",

        // Password reset
        forgot_password_link: "Mot de passe oublié ?",
        forgot_password_title: "Mot de passe oublié",
        forgot_password_description: "Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.",
        forgot_password_send: "Envoyer le lien",
        back_to_login: "← Retour à la connexion",
        password_reset_email_sent: "Si un compte avec cet email existe, vous recevrez un lien de réinitialisation.",
        reset_password_title: "Réinitialiser le mot de passe",
        reset_password_new: "Nouveau mot de passe",
        reset_password_confirm: "Confirmer le nouveau mot de passe",
        reset_password_submit: "Réinitialiser",
        password_reset_success: "Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter.",
        password_min_length: "Le mot de passe doit contenir au moins 8 caractères",

        // Warnings
        warning_payment_cancel: "Le paiement a été annulé. Aucun frais n'a été prélevé.",

        // Payments
        buy_tokens_title: "Acheter des jetons",
        back_to_account: "Retour au compte",
        payment_checkout: "Paiement",
        buy_now: "Acheter maintenant",
        pay_now: "Payer maintenant",
        payment_creating: "Création du paiement...",
        error_create_payment: "Échec de la création du paiement",
        payment_vat: "TVA",
        payment_total: "Total",
        payment_buy_tokens: "Acheter des jetons",
        payment_choose_package: "Choisissez un pack de jetons pour continuer à utiliser les fonctionnalités premium",
        payment_secure_stripe: "Paiement sécurisé par Stripe",
        payment_secure_info: "Vos informations de paiement sont cryptées et sécurisées",
        payment_vat_info: "La TVA est automatiquement calculée en fonction de votre localisation lors du paiement",
        payment_redirecting: "Redirection vers le paiement sécurisé...",
        payment_loading_packages: "Chargement des packs...",
        payment_no_packages: "Aucun pack disponible pour le moment",
        payment_per_token: "par jeton",
        payment_price_ttc: "TTC",
        payment_price_ht: "HT",
        payment_bonus: "bonus",
        payment_popular: "Populaire",
        payment_history: "Historique des paiements",
        payment_invoice: "Facture",
        payment_download_invoice: "Télécharger la facture",
        payment_no_invoice: "Facture non disponible",
        payment_status: "Statut",
        payment_date: "Date",
        payment_amount: "Montant",
        payment_package: "Pack",
        payment_tokens: "Jetons",
        payment_no_history: "Aucun historique de paiement",
        no_payments_yet: "Aucun paiement pour le moment",
        download_invoice: "Télécharger",
        view_invoice: "Voir",
        error_load_payments: "Échec du chargement de l'historique des paiements",
        payment_status_pending: "En attente",
        payment_status_processing: "En cours",
        payment_status_succeeded: "Réussi",
        payment_status_failed: "Échoué",
        payment_status_canceled: "Annulé",
        payment_status_refunded: "Remboursé",
        account_title: "Mon compte",
        account_email: "Email",
        account_username: "Nom d'utilisateur",
        account_tokens_balance: "Solde de jetons",
        account_unlimited_tokens: "Jetons illimités",
        account_member_since: "Membre depuis",
        account_tab_info: "Informations du compte",
        account_tab_payments: "Historique des paiements",
        account_tab_billing: "Informations de facturation",
        account_tab_security: "Sécurité",
        back_to_map: "Retour à la carte",
        billing_info_title: "Informations de facturation",
        billing_info_description: "Ces informations seront utilisées pour les factures. Optionnel mais recommandé pour les achats professionnels.",
        billing_full_name: "Nom complet / Raison sociale",
        billing_address: "Adresse",
        billing_postal_code: "Code postal",
        billing_city: "Ville",
        billing_country: "Pays",
        billing_vat_number: "Numéro de TVA (optionnel)",
        success_billing_updated: "Informations de facturation mises à jour avec succès",
        payment_history_title: "Historique des paiements",
        payment_im_business: "Je suis une entreprise (avec numéro de TVA)",
        payment_business_help: "Cochez cette case pour saisir un numéro de TVA intracommunautaire",
        payment_tax_auto: "La TVA sera calculée automatiquement selon votre pays",
        payment_loading: "Chargement du paiement sécurisé...",
        payment_invoice_ready: "Votre facture est disponible",
        payment_vat_calculated: "+ TVA calculée automatiquement",
        pay_now: "Payer maintenant",
        payment_accept_cgv: "J'accepte les",
        payment_cgv_link: "Conditions Générales de Vente",

        // Codes promo
        promo_code_title: "Vous avez un code promo ?",
        promo_code: "Code promo",
        promo_code_apply: "Appliquer",
        promo_code_required: "Veuillez saisir un code promo",
        promo_code_valid: "Code promo valide !",
        promo_new_balance: "Nouveau solde",
        promo_discount_applied_checkout: "de réduction sera appliquée au paiement",
        promo_select_package: "Sélectionnez un pack ci-dessus pour continuer",
        processing: "Traitement...",

        account_current_password: "Mot de passe actuel",
        account_new_password: "Nouveau mot de passe",
        account_confirm_password: "Confirmer le nouveau mot de passe",
        account_change_password: "Changer le mot de passe",
        account_change_email: "Changer l'email",
        account_new_email: "Nouvel email",
        account_save_changes: "Enregistrer les modifications",
        success_password_changed: "Mot de passe modifié avec succès",
        success_email_changed: "Email modifié avec succès",
        error_password_mismatch: "Les mots de passe ne correspondent pas",
        error_current_password_wrong: "Le mot de passe actuel est incorrect",

        // Partage de cartes
        share_map_title: "Partager la carte",
        share_map_button: "Partager la carte",
        share_map_description: "Si vous choisissez de partager votre carte, elle sera sauvegardée anonymement dans notre base de données avec un code (4 mots-chiffres) et une URL.",
        share_map_readonly: "Partage Lecture Seule",
        share_map_readonly_free: "Gratuit",
        share_map_readonly_description: "Les autres peuvent voir votre carte mais ne peuvent pas la modifier",
        share_map_create: "Créer le partage",
        share_map_creating: "Création du partage...",
        share_map_code: "Code de partage",
        share_map_url: "URL de partage",
        share_map_copy_url: "Copier l'URL",
        share_map_copy_code: "Copier le code",
        share_map_url_copied: "URL copiée dans le presse-papier !",
        share_map_code_copied: "Code copié dans le presse-papier !",
        share_map_name: "Nom de la carte (optionnel)",
        share_map_description_field: "Description (optionnelle)",
        share_map_name_placeholder: "ex: Ma carte personnalisée",
        share_map_description_placeholder: "Décrivez ce que représente cette carte...",
        share_map_my_shares: "Mes cartes partagées",
        share_map_no_shares: "Vous n'avez partagé aucune carte pour le moment",
        share_map_view_count: "vues",
        share_map_edit_count: "modifications",
        share_map_created: "Créée le",
        share_map_delete: "Supprimer le partage",
        share_map_delete_confirm: "Supprimer cette carte partagée ?",
        share_map_deleted: "Carte partagée supprimée avec succès",
        share_map_max_reached: "Vous avez atteint le nombre maximum de cartes partagées (5)",
        share_map_loading: "Chargement de la carte partagée...",
        share_map_not_found: "Carte partagée introuvable",
        share_map_readonly_mode: "Mode Lecture Seule",
        share_map_users_online: "utilisateurs en ligne",
        share_map_you: "Vous",
        share_map_anonymous: "Anonyme",
        share_map_user_joined: "a rejoint la carte",
        share_map_user_left: "a quitté la carte",
        share_map_sync_update: "Carte mise à jour par",
        share_map_connection_lost: "Connexion perdue. Tentative de reconnexion...",
        share_map_connection_restored: "Connexion rétablie !",
        share_map_open: "Ouvrir une carte partagée",
        share_map_enter_code: "Entrez le code de partage",
        share_map_code_format: "Format : mot1-mot2-mot3-mot4",
        share_map_login_required: "Connectez-vous pour gérer vos cartes partagées",
        share_map_clone: "Charger dans une nouvelle carte",
        share_map_clone_tooltip: "Charger ces données dans votre stockage local",
        share_map_clone_confirm: "Charger ces données dans votre stockage local ? Cela remplacera vos données actuelles.",
        share_map_cloned_success: "Données chargées avec succès ! Redirection...",
        share_map_login_prompt: "Voulez-vous vous connecter maintenant ?",

        // Authentication errors
        auth_required_message: "Authentification requise pour accéder à cette fonctionnalité.",
        auth_required_login_prompt: "Voulez-vous vous connecter maintenant ?",
        auth_required_cancelled: "Action annulée. Veuillez vous connecter pour continuer.",

        // Prompts
        prompt_layer_name: "Nom du calque :",
        prompt_delete_layer: "Supprimer ce calque ?",
        prompt_delete_element: "Supprimer cet élément ?",
        prompt_clear_all: "Effacer toutes les données ? Cette action est irréversible.",
        prompt_purge_storage: "Êtes-vous sûr de vouloir purger le localStorage ?<br><br>Toutes les données sauvegardées automatiquement seront supprimées.<br><br>Les tracés actuellement affichés resteront sur la carte jusqu'à ce que vous rechargiez la page.",
        prompt_delete_point: "Supprimer le point",
        prompt_delete_point_with_structures: "Cela affectera :",
        prompt_line_with_points: "Ligne avec {count} points",
        prompt_polygon_with_points: "Polygone avec {count} points",
        prompt_circle_complete_deletion: "Cercle (suppression complète)",
        prompt_delete_query: "Supprimer la requête \"{name}\" de l'historique ?\n\nLes calques créés à partir de cette requête resteront sur la carte.",
        prompt_delete_query_keep_layer: "Retirer \"{name}\" de l'historique des requêtes ?\n\nLe calque et ses {count} éléments resteront sur la carte.",
        remove: "Retirer",
        query_removed: "Requête \"{name}\" retirée de l'historique",
        query_removed_layer_kept: "Requête retirée. Calque \"{name}\" conservé sur la carte.",
        executing_query: "Exécution de la requête...",
        query_executed_successfully: "Requête exécutée avec succès !",
        no_queries_to_delete: "Aucune requête à supprimer",
        all_queries_deleted: "Toutes les requêtes supprimées de l'historique",
        prompt_delete_all_queries: "Supprimer toutes les requêtes sauvegardées de l'historique ?\n\nLes calques resteront sur la carte.",

        // Warnings
        warning_no_results_to_save: "Aucun résultat à sauvegarder",
        warning_add_at_least_one_item: "Veuillez ajouter au moins un élément à rechercher",
        warning_select_existing_element: "Veuillez sélectionner un élément existant",
        warning_enter_overpass_query: "Veuillez saisir une requête Overpass",
        warning_no_query_to_copy: "Aucune requête à copier",

        // Misc
        distance_meters: "m",
        distance_kilometers: "km",
        area_square_meters: "m²",
        area_square_kilometers: "km²",
        time_seconds: "s",
        time_minutes: "min",
        coords_latitude: "Latitude",
        coords_longitude: "Longitude",
        coords_altitude: "Altitude",

        // Toolbar tooltips (sidebar)
        toolbar_import_export: "Import/Export Fichiers",
        toolbar_pan_map: "Navigation (V)",
        toolbar_named_points: "Points Nommés (P)",
        toolbar_measured_line: "Ligne Mesurée (L)",
        toolbar_circle_area: "Cercle (C)",
        toolbar_polygon_area: "Polygone (Shift+P)",
        toolbar_isochrones: "Isochrones (I)",
        toolbar_overpass_ai: "Générateur Overpass IA",
        toolbar_image_ai: "Géolocalisation Image IA",
        toolbar_toggle_layers: "Panneau Calques",
        toolbar_share_map: "Partager la carte",

        // Files box
        files_title: "Fichiers",
        files_new_layer: "Nouveau Calque",
        files_new_layer_tooltip: "Créer un nouveau calque",
        files_import: "Importer",
        files_import_tooltip: "Importer des données depuis un fichier",
        files_export_json: "Exporter JSON",
        files_export_json_format: "(JSON Rhinomap)",
        files_export_json_tooltip: "Exporter la carte complète avec calques",
        files_export_geojson: "Exporter GeoJSON",
        files_export_geojson_tooltip: "Exporter pour logiciels SIG",
        files_export_csv: "Exporter CSV",
        files_export_csv_tooltip: "Exporter en CSV",
        files_export_kml: "Exporter KML",
        files_export_kml_tooltip: "Exporter en KML",
        files_clear_storage: "Vider le stockage",
        files_clear_storage_tooltip: "Vider tout le stockage local",

        // Overpass box
        overpass_box_title: "Requête Overpass",
        overpass_tab_ai_label: "Assistant IA",
        overpass_tab_manual_label: "Script Manuel",
        overpass_search_area: "Zone de recherche",
        overpass_manual_intro: "Écrivez votre requête Overpass QL personnalisée ci-dessous.",
        overpass_learn_syntax: "Apprendre la syntaxe",
        overpass_custom_query: "Requête Overpass personnalisée",
        overpass_bbox_hint: "Utilisez {{bbox}} pour les limites actuelles de la carte",
        overpass_templates: "Modèles rapides",
        overpass_select_template: "Sélectionner un modèle...",
        overpass_template_amenity: "Trouver des commodités (cafés, restaurants...)",
        overpass_template_shop: "Trouver des commerces",
        overpass_template_roads: "Trouver des routes par type",
        overpass_template_buildings: "Trouver des bâtiments",
        overpass_template_natural: "Trouver des éléments naturels",
        overpass_template_custom: "Modèle personnalisé",
        overpass_execute_custom: "Exécuter la requête personnalisée",
        overpass_turbo: "Turbo",
        overpass_temp_filters_title: "Résultats temporaires - Filtres",
        overpass_save_hint: "Cliquez sur Sauvegarder pour créer des calques pour chaque type d'élément visible",
        overpass_saved_queries: "Requêtes sauvegardées",
        overpass_clear_all: "Supprimer toutes les requêtes",
        overpass_tokens_info: "jetons / message",
        overpass_new_btn: "Nouveau",
        overpass_no_zones: "Aucune zone/cercle/polygone disponible",
        overpass_visible_area: "zone visible de la carte",

        // Image analysis box
        image_analysis_box_title: "Analyse d'Image",
        image_analysis_disclaimer_title: "Analyse Indicative",
        image_analysis_disclaimer_text: "La géolocalisation par IA fournit des indices utiles et réduit les zones de recherche, mais ne peut égaler la précision d'une recherche manuelle par un spécialiste. Utilisez les résultats comme point de départ pour une investigation plus approfondie.",
        image_analysis_select_image: "Sélectionner une Image",
        image_analysis_additional_info: "Informations complémentaires (optionnel)",
        image_analysis_hints_desc: "Ajoutez des indices pour améliorer la précision (pays, région, date, points de repère connus...)",
        image_analysis_context_hint: "ex: Photo prise en région parisienne, près de la Tour Eiffel. N'hésitez pas à mentionner du texte, des plaques ou des véhicules.",
        image_analysis_select_regions: "Sélectionner des régions spécifiques (max 3)",
        image_analysis_regions_hint: "Dessinez des rectangles sur les panneaux, plaques ou points de repère pour des résultats plus précis",
        image_analysis_selected_regions: "Régions sélectionnées",
        image_analysis_clear_regions: "Tout effacer",
        image_analysis_analyze_btn: "Analyser (10 jetons)",

        // AI Search History
        ai_history_title: "Historique Recherches IA",
        ai_history_empty: "Aucun historique de recherche",

        // Line Constraints
        line_constraints_title: "Contraintes de tracé",
        line_constraints_segments: "Segments :",
        line_constraints_total: "Total :",
        line_constraints_lock_distance: "Verrouiller la distance",
        line_constraints_meters_placeholder: "mètres",
        line_constraints_lock_azimuth: "Verrouiller l'azimut",
        line_constraints_degrees_placeholder: "degrés",
        line_constraints_reset: "Réinitialiser",
        line_constraints_finish: "Terminer",
        line_constraints_hint1: "ajouter segment",
        line_constraints_hint1_right: "terminer",
        line_constraints_hint2_ctrl: "terminer",
        line_constraints_hint2_esc: "annuler",

        // Isochrone Settings
        isochrone_settings_title: "Paramètres Isochrone",
        isochrone_click_to_place: "Cliquez sur la carte pour placer le point de départ",
        isochrone_transport_mode: "Mode de transport",
        isochrone_transport_car: "Voiture",
        isochrone_transport_pedestrian: "Piéton",
        isochrone_calc_mode: "Mode de calcul",
        isochrone_calc_time: "Isochrone (temps)",
        isochrone_calc_distance: "Isodistance",
        isochrone_direction: "Direction",
        isochrone_direction_from: "Depuis le point",
        isochrone_direction_to: "Vers le point",
        isochrone_duration: "Durée",
        isochrone_constraints: "Contraintes (éviter)",
        isochrone_avoid_tolls: "Péages",
        isochrone_avoid_tunnels: "Tunnels",
        isochrone_avoid_bridges: "Ponts",
        isochrone_calculate: "Calculer",
        isochrone_hint1: "placer le point",
        isochrone_hint1_reclick: "déplacer",
        isochrone_hint2_esc: "annuler",

        // Map controls
        map_view_tooltip: "Vue Carte",
        satellite_view_tooltip: "Vue Satellite",
        constraints_tool_tooltip: "Contraintes de tracé (Ctrl+L)",

        // Search
        search_input_placeholder: "Rechercher un lieu...",

        // Point Name Modal
        point_name_modal_title: "Nommer le point",
        point_name_placeholder: "Nom du point",
        modal_confirm: "Confirmer",

        // Context menu
        context_edit: "Modifier",
        context_color: "Couleur",

        // Color submenu
        color_title: "Couleur",
        color_red: "Rouge",
        color_blue: "Bleu",
        color_green: "Vert",
        color_orange: "Orange",
        color_purple: "Violet",
        color_pink: "Rose",

        // Login/Register modals
        login_title: "Connexion",
        login_sign_in: "Se connecter",
        register_title: "Créer un compte",
        register_confirm_password: "Confirmer le mot de passe",
        register_sign_up: "S'inscrire",

        // Icon picker
        icon_picker_title: "Choisir une icône",
        icon_picker_search: "Rechercher des icônes...",

        // Share map extras
        share_map_info_text: "Si vous choisissez de partager votre carte, elle sera sauvegardée anonymement dans notre base de données avec un code unique et une URL.",
        share_map_optional: "optionnel",
        share_map_success_title: "Succès !",
        share_map_untitled: "Carte sans titre",
        share_map_readonly_badge: "Lecture seule",
        share_map_views: "vues",
        share_map_copy_btn: "Copier",
        share_map_open_btn: "Ouvrir",
        share_map_update_btn: "Mettre à jour",
        share_map_update_confirm: "Mettre à jour la carte partagée avec les données actuelles ?",
        share_map_updated: "Carte partagée mise à jour avec succès !",
        share_map_update_failed: "Échec de la mise à jour de la carte partagée",
        share_map_no_maps: "Aucune carte partagée",
        share_map_error_loading: "Erreur lors du chargement des partages",
        share_map_not_ready: "Gestionnaire de partage non prêt",

        // Export image extras
        export_image_generating_overlay: "Génération de l'image...",
        export_image_title_placeholder: "Ma Carte",

        // Layers sidebar
        layers_close_tooltip: "Fermer le panneau calques",
        new_layer: "Nouveau Calque",

        // Landing page (index.html)
        // Hero
        index_tagline_1: "Débloquez l'Intelligence Géospatiale",
        index_tagline_2: "avec la Cartographie IA",
        index_subtitle_1: "Transformez vos images en coordonnées. Générez des requêtes OSM complexes en secondes.",
        index_subtitle_2: "Boîte à outils OSINT respectueuse de la vie privée.",
        index_start_free: "Commencer gratuitement",
        index_view_pricing: "Voir les tarifs",

        // Card - Free
        index_badge_free: "GRATUIT POUR TOUJOURS",
        index_essential_toolkit: "Boîte à Outils Essentielle",
        index_essential_desc: "Tout ce dont vous avez besoin pour l'analyse géospatiale professionnelle. Sans carte bancaire. Sans limite de temps.",
        index_feat_named_points: "Points nommés et marqueurs",
        index_feat_measured_lines: "Lignes mesurées avec azimut",
        index_feat_circular_zones: "Zones circulaires et polygones",
        index_feat_area_calc: "Calculs de surfaces et distances",
        index_feat_isochrones: "Isochrones France (IGN)",
        index_feat_export: "Export JSON/GeoJSON/CSV/KML",
        index_feat_local_storage: "Stockage local (confidentialité)",
        index_feat_no_registration: "Aucune inscription requise",
        index_start_for_free: "Commencer gratuitement",

        // Card - Premium
        index_badge_ai: "INTELLIGENCE ARTIFICIELLE",
        index_premium_title: "Intelligence Premium",
        index_premium_desc: "Exploitez l'IA de pointe pour résoudre des défis de géolocalisation complexes en secondes.",
        index_feat_everything_free: "<strong>Tout le gratuit, plus :</strong>",
        index_feat_overpass_gen: "🤖 <strong>Générateur Overpass QL</strong> - Langage naturel → Requêtes OSM (5 jetons)",
        index_feat_image_geo: "📸 <strong>Géolocalisation d'images</strong> - Analyse IA avec zones de recherche (10 jetons)",
        index_feat_solve_minutes: "⚡ Résolvez en minutes ce qui prend des heures",
        index_feat_spatial_analysis: "🎯 Analyse spatiale avancée par IA",
        index_feat_no_retention: "🔒 Confidentialité : Aucune rétention de données",
        index_feat_tokens_never_expire: "💰 Paiement à l'usage, les jetons n'expirent jamais",
        index_try_premium: "Essayer Premium",

        // Why Choose RhinoMap
        index_why_title: "Pourquoi choisir RhinoMap ?",
        index_why_subtitle: "La seule plateforme de cartographie OSINT qui combine géolocalisation d'images par IA et requêtes Overpass automatisées — le tout en respectant votre vie privée.",
        index_why_privacy_title: "Architecture Confidentialité",
        index_why_privacy_desc: "Vos données restent dans votre navigateur. Pas de tracking, pas de rétention, pas d'accès tiers.",
        index_why_ai_title: "Intelligence par IA",
        index_why_ai_desc: "Des modèles d'IA de pointe pour une précision inégalée et la génération automatisée de requêtes OSM.",
        index_why_fast_title: "Flux de travail 10x plus rapide",
        index_why_fast_desc: "Ce qui prend des heures (syntaxe Overpass, analyse d'images) ne prend que quelques secondes en langage naturel.",
        index_why_open_title: "Ouvert et interopérable",
        index_why_open_desc: "Basé sur OpenStreetMap. Export JSON, GeoJSON, CSV, KML. Sans dépendance fournisseur.",
        index_why_query_title: "Constructeur de requêtes avancé",
        index_why_query_desc: "Générez des requêtes Overpass QL à partir de descriptions simples. Aucune connaissance syntaxique requise.",
        index_why_paygo_title: "Paiement à l'usage",
        index_why_paygo_desc: "Sans abonnement. Sans engagement. Les jetons n'expirent jamais.",

        // Pricing
        index_pricing_title: "Tarification simple et transparente",
        index_pricing_pay_only: "Ne payez que ce que vous utilisez.",
        index_pricing_no_sub: "Pas d'abonnement.",
        index_pricing_tokens_scale: "Les jetons n'expirent jamais. Commencez petit, évoluez selon vos besoins.",
        index_pricing_loading: "Chargement des tarifs...",
        index_pricing_note: "Tous les packs incluent la génération Overpass et la géolocalisation d'images",
        index_pricing_no_packages: "Aucun pack disponible pour le moment",
        index_pricing_error: "Erreur de chargement des tarifs. Veuillez actualiser la page.",
        index_pricing_best_value: "Meilleur rapport qualité-prix",
        index_pricing_get_started: "Commencer",

        // Pack info
        index_pack_try: "Essayer RhinoMap",
        index_pack_best_value: "Meilleur rapport qualité-prix",
        index_pack_pro_power: "Puissance Pro",
        index_pack_13_analyses: "~13 analyses d'images",
        index_pack_20_queries: "ou ~20 requêtes Overpass",
        index_pack_get_started: "Parfait pour commencer",
        index_pack_40_analyses: "~40 analyses d'images",
        index_pack_80_queries: "ou ~80 requêtes Overpass",
        index_pack_popular: "Le choix le plus populaire",
        index_pack_120_analyses: "~120 analyses d'images",
        index_pack_240_queries: "ou ~240 requêtes Overpass",
        index_pack_intensive: "Pour les utilisateurs intensifs",

        // Auth modal
        index_auth_welcome: "Bienvenue sur RhinoMap",
    }
};

// Current language (default: English, always English for now)
let currentLanguage = 'en';

// Force English for production (remove this to enable multi-language)
const FORCE_ENGLISH = false;

/**
 * Set the current language
 * @param {string} lang - Language code ('en', 'fr', etc.)
 */
function setLanguage(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        localStorage.setItem('rhinomap_language', lang);

        // Trigger language change event for UI updates
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
        }
    }
}

/**
 * Get translation for a key
 * @param {string} key - Translation key
 * @param {object} params - Optional parameters for string interpolation
 * @returns {string} Translated string
 */
function t(key, params = {}) {
    let text = translations[currentLanguage]?.[key] || translations['en']?.[key] || key;

    // Simple parameter interpolation
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });

    return text;
}

/**
 * Get current language
 * @returns {string} Current language code
 */
function getLanguage() {
    return currentLanguage;
}

/**
 * Initialize language from localStorage or browser
 */
function initLanguage() {
    // Force English if enabled
    if (FORCE_ENGLISH) {
        currentLanguage = 'en';
        localStorage.setItem('rhinomap_language', 'en');
        return;
    }

    // Try to load from localStorage
    const savedLang = localStorage.getItem('rhinomap_language');
    if (savedLang && translations[savedLang]) {
        currentLanguage = savedLang;
        return;
    }

    // Try to detect from browser
    const browserLang = navigator.language || navigator.userLanguage;
    const langCode = browserLang.split('-')[0]; // Get 'en' from 'en-US'

    if (translations[langCode]) {
        currentLanguage = langCode;
    } else {
        currentLanguage = 'en'; // Default to English
    }

    localStorage.setItem('rhinomap_language', currentLanguage);
}

/**
 * Apply translations to all elements with data-i18n attributes
 * Handles: data-i18n (textContent), data-i18n-placeholder, data-i18n-title, data-i18n-tooltip
 * @param {HTMLElement} root - Root element to search within (default: document)
 */
function applyTranslations(root) {
    const container = root || document;

    // Translate text content
    container.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) el.textContent = t(key);
    });

    // Translate placeholders
    container.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) el.placeholder = t(key);
    });

    // Translate title attributes
    container.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (key) el.title = t(key);
    });

    // Translate data-tooltip attributes
    container.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
        const key = el.getAttribute('data-i18n-tooltip');
        if (key) el.setAttribute('data-tooltip', t(key));
    });

    // Translate innerHTML (for elements with embedded HTML like <strong>, <br>, emojis)
    container.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (key) el.innerHTML = t(key);
    });
}

// Auto-initialize on load
if (typeof window !== 'undefined') {
    initLanguage();

    // Apply translations when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => applyTranslations());
    } else {
        applyTranslations();
    }

    // Re-apply translations on language change
    window.addEventListener('languageChanged', () => applyTranslations());
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { t, setLanguage, getLanguage, initLanguage, applyTranslations };
}

// Make available globally
if (typeof window !== 'undefined') {
    window.i18n = { t, setLanguage, getLanguage, initLanguage, applyTranslations };
}
