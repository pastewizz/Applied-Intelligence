export const mapSupabaseError = (error) => {
    if (!error) return "An unexpected error occurred.";
    
    const message = error.message || "";
    
    if (message.includes("Invalid login credentials")) {
        return "The email or password you entered is incorrect. Please check and try again.";
    }
    
    if (message.includes("Email not confirmed")) {
        return "Your email address hasn't been verified yet. Please check your inbox for the confirmation link.";
    }
    
    if (message.includes("User already registered")) {
        return "An account with this email already exists. Try signing in instead.";
    }
    
    if (message.includes("Password should be at least")) {
        return "Your password is too short. Please use at least 6 characters.";
    }

    if (message.includes("rate limit exceeded")) {
        return "Too many attempts. Please wait a few minutes before trying again.";
    }
    
    if (message.includes("Network request failed")) {
        return "Unable to connect to the server. Please check your internet connection.";
    }

    return message || "Something went wrong. Please try again.";
};
