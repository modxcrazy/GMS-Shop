import { db, auth, storage } from './firebase-config.js';

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
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');
const userDropdown = document.getElementById('user-dropdown');
const categoryCards = document.querySelectorAll('.category-card');
const categoryLinks = document.querySelectorAll('[data-category]');
const dealsLink = document.getElementById('deals-link');
const shopNowBtn = document.getElementById('shop-now-btn');

// Cart state
let cart = JSON.parse(localStorage.getItem('cart')) || [];
updateCartCount();

// Modal Event Listeners
loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.style.display = 'block';
});

registerBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.style.display = 'none';
    registerModal.style.display = 'block';
});

showLoginBtn?.addEventListener('click', (e) => {
    e.preventDefault();
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
    // Featured products
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
            featuredProductsGrid.innerHTML = '<p>Error loading products. Please try again later.</p>';
        });

    // Deal products
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
            dealsProductsGrid.innerHTML = '<p>Error loading deals. Please try again later.</p>';
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
            <img src="${product.image}" alt="${product.name}" loading="lazy">
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
    
    // Add event listeners
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
                            <button class="buy-now">Buy Now</button>
                        </div>
                    </div>
                `;
                
                // Add event listeners
                productDetailContent.querySelector('.add-to-cart').addEventListener('click', () => {
                    addToCart(product);
                    productModal.style.display = 'none';
                });
                
                productDetailContent.querySelector('.buy-now').addEventListener('click', () => {
                    addToCart(product);
                    productModal.style.display = 'none';
                    window.location.href = 'cart.html';
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
    showToast(`${product.name} added to cart`);
}

// Update cart count
function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = count;
}

// Show toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Newsletter subscription
newsletterForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = newsletterForm.querySelector('input').value;
    
    db.collection('newsletters').add({
        email: email,
        subscribedAt: firebase.firestore.FieldValue.serverTimestamp(),
        active: true
    })
    .then(() => {
        showToast('Thank you for subscribing!');
        newsletterForm.reset();
    })
    .catch(error => {
        console.error("Error subscribing to newsletter: ", error);
        showToast('Error subscribing. Please try again.');
    });
});

// Login form
loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in
            showToast('Login successful!');
            loginModal.style.display = 'none';
            loginForm.reset();
        })
        .catch((error) => {
            console.error("Login error: ", error);
            showToast(error.message);
        });
});

// Register form
registerForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = registerForm.querySelector('input[type="text"]').value;
    const email = registerForm.querySelector('input[type="email"]').value;
    const password = registerForm.querySelector('input[type="password"]').value;
    const confirmPassword = registerForm.querySelectorAll('input[type="password"]')[1].value;
    
    if (password !== confirmPassword) {
        showToast("Passwords don't match!");
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
                orders: [],
                shippingAddress: null
            });
        })
        .then(() => {
            showToast('Registration successful!');
            registerModal.style.display = 'none';
            registerForm.reset();
        })
        .catch((error) => {
            console.error("Registration error: ", error);
            showToast(error.message);
        });
});

// Search functionality
searchBtn?.addEventListener('click', handleSearch);
searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

function handleSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (searchTerm.length < 2) {
        showToast('Please enter at least 2 characters');
        return;
    }
    
    db.collection('products')
        .orderBy('name')
        .startAt(searchTerm)
        .endAt(searchTerm + '\uf8ff')
        .limit(5)
        .get()
        .then(querySnapshot => {
            searchResults.innerHTML = '';
            
            if (querySnapshot.empty) {
                searchResults.innerHTML = '<div class="no-results">No products found</div>';
            } else {
                querySnapshot.forEach(doc => {
                    const product = doc.data();
                    product.id = doc.id;
                    
                    const resultItem = document.createElement('div');
                    resultItem.className = 'search-result-item';
                    resultItem.innerHTML = `
                        <img src="${product.image}" alt="${product.name}">
                        <div>
                            <h4>${product.name}</h4>
                            <p>$${product.price.toFixed(2)}</p>
                        </div>
                        <button class="view-details" data-id="${product.id}">View</button>
                    `;
                    
                    resultItem.querySelector('.view-details').addEventListener('click', () => {
                        showProductDetails(product.id);
                        searchResults.style.display = 'none';
                    });
                    
                    searchResults.appendChild(resultItem);
                });
            }
            
            searchResults.style.display = 'block';
        })
        .catch(error => {
            console.error("Error searching products: ", error);
            searchResults.innerHTML = '<div class="no-results">Error searching products</div>';
            searchResults.style.display = 'block';
        });
}

// Close search results when clicking outside
document.addEventListener('click', (e) => {
    if (e.target !== searchInput && e.target !== searchBtn) {
        searchResults.style.display = 'none';
    }
});

// Category navigation
categoryCards.forEach(card => {
    card.addEventListener('click', () => {
        const category = card.getAttribute('data-category');
        filterProductsByCategory(category);
    });
});

categoryLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const category = link.getAttribute('data-category');
        filterProductsByCategory(category);
    });
});

dealsLink?.addEventListener('click', (e) => {
    e.preventDefault();
    filterProductsByDeals();
});

function filterProductsByCategory(category) {
    // In a real app, you would navigate to a products page with this filter
    // For this demo, we'll just show an alert
    showToast(`Showing ${category} products`);
}

function filterProductsByDeals() {
    // In a real app, you would navigate to a deals page
    showToast('Showing all deals');
}

// Shop now button
shopNowBtn?.addEventListener('click', () => {
    // Scroll to products section
    document.querySelector('.products').scrollIntoView({ behavior: 'smooth' });
});

// Check auth state
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        loginBtn.innerHTML = `<i class="fas fa-user"></i> My Account`;
        loginBtn.onclick = (e) => {
            e.preventDefault();
            showUserDropdown();
        };
    } else {
        // No user is signed in
        loginBtn.innerHTML = `<i class="fas fa-user"></i> Login`;
        loginBtn.onclick = (e) => {
            e.preventDefault();
            loginModal.style.display = 'block';
        };
    }
});

function showUserDropdown() {
    userDropdown.innerHTML = `
        <a href="#" id="my-account"><i class="fas fa-user-circle"></i> My Account</a>
        <a href="#" id="my-orders"><i class="fas fa-box"></i> My Orders</a>
        <a href="#" id="my-wishlist"><i class="fas fa-heart"></i> Wishlist</a>
        <a href="#" id="logout"><i class="fas fa-sign-out-alt"></i> Logout</a>
    `;
    
    userDropdown.style.display = 'block';
    
    // Add event listeners
    userDropdown.querySelector('#logout').addEventListener('click', () => {
        auth.signOut().then(() => {
            userDropdown.style.display = 'none';
            showToast('Logged out successfully');
        });
    });
    
    userDropdown.querySelector('#my-account').addEventListener('click', () => {
        alert('Account management coming soon!');
        userDropdown.style.display = 'none';
    });
    
    userDropdown.querySelector('#my-orders').addEventListener('click', () => {
        alert('Your orders will be shown here!');
        userDropdown.style.display = 'none';
    });
    
    userDropdown.querySelector('#my-wishlist').addEventListener('click', () => {
        alert('Your wishlist will be shown here!');
        userDropdown.style.display = 'none';
    });
    
    // Close dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!userDropdown.contains(e.target) && e.target !== loginBtn) {
                userDropdown.style.display = 'none';
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 100);
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    
    // Add toast notification styles
    const toastStyles = document.createElement('style');
    toastStyles.textContent = `
        .toast-notification {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: var(--primary-color);
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .toast-notification.show {
            opacity: 1;
        }
    `;
    document.head.appendChild(toastStyles);
});
