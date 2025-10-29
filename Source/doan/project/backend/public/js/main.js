// Demo data loader
(function seedIfNeeded(){
    const existing = JSON.parse(localStorage.getItem('events')||'[]');
    if (existing.length) return;

    const today = new Date();
    function dPlus(days){ const d=new Date(today); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }

    const demo = [
        {
            id:'E001',
            title:'Chào mừng Tân sinh viên 2025',
            date:dPlus(2),
            location:'Hội trường A',
            image:'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=400&fit=crop',
            category:'Lễ hội',
            description:'Sự kiện giới thiệu dành cho tân sinh viên, gặp gỡ câu lạc bộ và ban chủ nhiệm.',
            currentParticipants:120,
            maxParticipants:300,
            status:'upcoming'
        },
        {
            id:'E002',
            title:'Workshop Kỹ năng Thuyết trình',
            date:dPlus(5),
            location:'Phòng B204',
            image:'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=400&fit=crop',
            category:'Workshop',
            description:'Rèn luyện kỹ năng nói trước đám đông với chuyên gia đào tạo.',
            currentParticipants:80,
            maxParticipants:120,
            status:'upcoming'
        },
        {
            id:'E003',
            title:'Giải chạy tiếp sức Khoa CNTT',
            date:dPlus(9),
            location:'Sân vận động',
            image:'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=400&fit=crop',
            category:'Thể thao',
            description:'Sự kiện thể thao thường niên kết nối các lớp trong khoa.',
            currentParticipants:45,
            maxParticipants:100,
            status:'upcoming'
        },
        {
            id:'E004',
            title:'Seminar AI trong Giáo dục',
            date:dPlus(-3),
            location:'Hội trường B',
            image:'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop',
            category:'Seminar',
            description:'Chia sẻ xu hướng ứng dụng AI vào lớp học thông minh.',
            currentParticipants:200,
            maxParticipants:200,
            status:'finished'
        }
    ];
    localStorage.setItem('events', JSON.stringify(demo));
})();

// Helper functions
function getUpcomingTop3(){
    const events = JSON.parse(localStorage.getItem('events')||'[]');
    return events.filter(e => e.status === 'upcoming').slice(0,3);
}

function el(tag, cls, html){ 
    const x=document.createElement(tag); 
    if(cls) x.className=cls; 
    if(html!==undefined) x.innerHTML=html; 
    return x; 
}

// Render functions
function renderUpcomingList(){
    const list = document.getElementById('upcomingList');
    if (!list) return;
    
    list.innerHTML = '';
    const items = getUpcomingTop3();
    items.forEach((event, idx) => {
        const row = el('div','flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors fade-up');
        row.style.animationDelay = (0.2 + idx*0.05) + 's';

        const img = el('img','w-12 h-12 rounded-lg object-cover');
        img.src = event.image; 
        img.alt = event.title;

        const info = el('div','flex-1');
        info.appendChild(el('p','font-medium text-gray-900 text-sm', event.title));
        info.appendChild(el('p','text-xs text-gray-500', `${event.date} • ${event.location}`));

        row.appendChild(img);
        row.appendChild(info);
        list.appendChild(row);
    });
}

function renderFeatured(){
    const wrap = document.getElementById('featuredGrid');
    if (!wrap) return;
    
    wrap.innerHTML = '';
    const items = getUpcomingTop3();
    items.forEach((event, idx) => {
        const card = el('div','bg-white rounded-2xl shadow-lg overflow-hidden group hover:shadow-2xl transition-all transform hover:scale-105 fade-up');
        card.style.animationDelay = (0.05 + idx*0.05) + 's';

        const top = el('div','relative');
        const img = el('img','w-full h-48 object-cover'); 
        img.src = event.image; 
        img.alt = event.title;
        const badge = el('div','absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-blue-600', event.category);

        top.appendChild(img); 
        top.appendChild(badge);

        const body = el('div','p-6');
        body.appendChild(el('h3','text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors', event.title));
        body.appendChild(el('p','text-gray-600 mb-4', event.description));
        const meta = el('div','flex items-center justify-between text-sm text-gray-500');
        meta.appendChild(el('span','', event.date));
        meta.appendChild(el('span','', `${event.currentParticipants}/${event.maxParticipants} đã đăng ký`));
        body.appendChild(meta);

        card.appendChild(top); 
        card.appendChild(body);
        wrap.appendChild(card);
    });
}

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS
    if (window.AOS) {
        AOS.init({
            duration: 800,
            once: true
        });
    }

    // Theme handling
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }

    // Register button animation
    const registerBtn = document.querySelector('a[href="Register.html"]');
    if (registerBtn) {
        registerBtn.addEventListener('mouseenter', () => {
            registerBtn.style.transform = 'translateY(-2px)';
        });
        registerBtn.addEventListener('mouseleave', () => {
            registerBtn.style.transform = 'translateY(0)';
        });
    }

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Initialize components
    renderUpcomingList();
    renderFeatured();

    // Hide loader
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = 'none';
    }
});