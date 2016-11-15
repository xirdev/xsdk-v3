// 'ident' and 'secret' should ideally be passed server-side for security purposes.
// If secureTokenRetrieval is true then you should remove these two values.

// Insecure method
var xirsysConnect = {
	secureTokenRetrieval : false,
	data : {
		domain : 'www.xirsys.com',
		application : 'default',
		room : 'default',
		ident : 'jerzilla',
		secret : '1d484d60-6af4-11e6-b627-ba45bfd7b2b0',
		secure : 1
	}
};

// Secure method
/*var xirsysConnect = {
	secureTokenRetrieval : true,
	server : '../getToken.php',
	data : {
		domain : '< www.yourdomain.com >',
		application : 'default',
		room : 'default',
		secure : 1
	}
};*/

