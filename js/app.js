// DOM Elements
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const productModal = document.getElementById('product-modal');
const closeBtns = document.querySelectorAll('.close-btn');
const featuredProductsGrid = document.getElementById('featured-products');
const dealsProductsGrid = document.getElementById('deals-products');
const cartCount = document.getElementById('cart-count');
const newsletterForm = document.getElementById('newsletter-form');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Cart state
let cart = JSON.parse(localStorage.getItem('cart')) || [];
updateCartCount();

// Modal Event Listeners
loginBtn.addEventListener('click', () => {
    loginModal.style.display = 'block';
});

registerBtn.addEventListener('click', () => {
    loginModal.style.display = 'none';
    registerModal.style.display = 'block';
});

showLoginBtn.addEventListener('click', () => {
    registerModal.style.display = 'none';
    loginModal.style.display = 'block';
});

closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        loginModal.style.display = 'none';
        registerModal.style.display = 'none';
        productModal.style.display = 'none';
    });
});

window.addEventListener('click', (e) => {
    if (e.target === loginModal) loginModal.style.display = 'none';
    if (e.target === registerModal) registerModal.style.display = 'none';
    if (e.target === productModal) productModal.style.display = 'none';
});

// Load products from Firebase
function loadProducts() {
    db.collection('products').where('featured', '==', true).limit(8).get()
        .then(querySnapshot => {
            featuredProductsGrid.innerHTML = '';
            querySnapshot.forEach(doc => {
                const product = doc.data();
                product.id = doc.id;
                renderProduct(product, featuredProductsGrid);
            });
        })
        .catch(error => {
            console.error("Error loading featured products: ", error);
        });

    db.collection('products').where('onSale', '==', true).limit(4).get()
        .then(querySnapshot => {
            dealsProductsGrid.innerHTML = '';
            querySnapshot.forEach(doc => {
                const product = doc.data();
                product.id = doc.id;
                renderProduct(product, dealsProductsGrid, true);
            });
        })
        .catch(error => {
            console.error("Error loading deal products: ", error);
        });
}

// Render product card
function renderProduct(product, container, isDeal = false) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    if (isDeal) productCard.classList.add('deal-item');
    
    let badge = '';
    if (product.discount > 0) {
        badge = `<span class="product-badge">${product.discount}% OFF</span>`;
    }
    
    const originalPrice = product.price * (1 + product.discount / 100);
    
    productCard.innerHTML = `
        <div class="product-image">
            ${badge}
            <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-brand">${product.brand}</p>
            <div class="product-price">
                <span class="current-price">$${product.price.toFixed(2)}</span>
                ${product.discount > 0 ? `
                    <span class="original-price">$${originalPrice.toFixed(2)}</span>
                    <span class="discount">Save ${product.discount}%</span>
                ` : ''}
            </div>
            <div class="product-actions">
                <button class="add-to-cart" data-id="${product.id}">Add to Cart</button>
                <button class="view-details" data-id="${product.id}">Details</button>
            </div>
        </div>
    `;
    
    container.appendChild(productCard);
    
    // Add event listeners to the buttons we just created
    productCard.querySelector('.add-to-cart').addEventListener('click', () => addToCart(product));
    productCard.querySelector('.view-details').addEventListener('click', () => showProductDetails(product.id));
}

// Show product details
function showProductDetails(productId) {
    db.collection('products').doc(productId).get()
        .then(doc => {
            if (doc.exists) {
                const product = doc.data();
                product.id = doc.id;
                
                const productDetailContent = document.getElementById('product-detail-content');
                productDetailContent.innerHTML = `
                    <div class="product-detail-image">
                        <img src="${product.image}" alt="${product.name}">
                    </div>
                    <div class="product-detail-info">
                        <h3 class="product-detail-title">${product.name}</h3>
                        <p class="product-detail-brand">Brand: ${product.brand}</p>
                        <div class="product-detail-price">
                            <span class="current-price">$${product.price.toFixed(2)}</span>
                            ${product.discount > 0 ? `
                                <span class="original-price">$${(product.price * (1 + product.discount / 100)).toFixed(2)}</span>
                                <span class="discount">${product.discount}% OFF</span>
                            ` : ''}
                        </div>
                        <div class="product-detail-description">
                            <h4>Description</h4>
                            <p>${product.description}</p>
                        </div>
                        <div class="product-detail-specs">
                            <h4>Specifications</h4>
                            <ul>
                                ${product.specs.map(spec => `<li>${spec}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="product-detail-actions">
                            <button class="add-to-cart" data-id="${product.id}">Add to Cart</button>
                            <button class="view-details">Buy Now</button>
                        </div>
                    </div>
                `;
                
                // Add event listener to the add to cart button in the modal
                productDetailContent.querySelector('.add-to-cart').addEventListener('click', () => {
                    addToCart(product);
                    productModal.style.display = 'none';
                });
                
                productModal.style.display = 'block';
            } else {
                alert('Product not found!');
            }
        })
        .catch(error => {
            console.error("Error getting product details: ", error);
            alert('Error loading product details');
        });
}

// Add to cart function
function addToCart(product) {
    // Check if product already exists in cart
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }
    
    // Update local storage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update cart count
    updateCartCount();
    
    // Show confirmation
    alert(`${product.name} has been added to your cart!`);
}

// Update cart count
function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = count;
}

// Newsletter subscription
newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = newsletterForm.querySelector('input').value;
    
    db.collection('newsletters').add({
        email: email,
        subscribedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        alert('Thank you for subscribing to our newsletter!');
        newsletterForm.reset();
    })
    .catch(error => {
        console.error("Error subscribing to newsletter: ", error);
        alert('There was an error subscribing. Please try again.');
    });
});

// Login form
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in
            alert('Login successful!');
            loginModal.style.display = 'none';
            loginForm.reset();
        })
        .catch((error) => {
            console.error("Login error: ", error);
            alert(error.message);
        });
});

// Register form
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = registerForm.querySelector('input[type="text"]').value;
    const email = registerForm.querySelector('input[type="email"]').value;
    const password = registerForm.querySelector('input[type="password"]').value;
    const confirmPassword = registerForm.querySelectorAll('input[type="password"]')[1].value;
    
    if (password !== confirmPassword) {
        alert("Passwords don't match!");
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // User created
            const user = userCredential.user;
            
            // Save additional user data to Firestore
            return db.collection('users').doc(user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                wishlist: [],
                orders: []
            });
        })
        .then(() => {
            alert('Registration successful! You can now login.');
            registerModal.style.display = 'none';
            registerForm.reset();
        })
        .catch((error) => {
            console.error("Registration error: ", error);
            alert(error.message);
        });
});

// Check auth state
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        loginBtn.innerHTML = `<i class="fas fa-user"></i> My Account`;
    } else {
        // No user is signed in
        loginBtn.innerHTML = `<i class="fas fa-user"></i> Login`;
    }
});

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});
