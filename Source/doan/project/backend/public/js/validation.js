// validation.js - Kiểm tra dữ liệu form
const ValidationService = {
    // Kiểm tra email
    validateEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    },

    // Kiểm tra mật khẩu
    validatePassword(password) {
        const minLength = 6;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const errors = [];
        if (password.length < minLength) {
            errors.push(`Mật khẩu phải có ít nhất ${minLength} ký tự`);
        }
        if (!hasUpperCase) {
            errors.push('Mật khẩu phải có ít nhất 1 chữ hoa');
        }
        if (!hasLowerCase) {
            errors.push('Mật khẩu phải có ít nhất 1 chữ thường');
        }
        if (!hasNumbers) {
            errors.push('Mật khẩu phải có ít nhất 1 số');
        }
        if (!hasSpecialChar) {
            errors.push('Mật khẩu phải có ít nhất 1 ký tự đặc biệt');
        }

        return {
            isValid: errors.length === 0,
            errors,
            score: this._calculatePasswordStrength(password)
        };
    },

    // Tính điểm mạnh yếu của mật khẩu
    _calculatePasswordStrength(password) {
        let score = 0;
        
        // Độ dài
        score += Math.min(2, Math.floor(password.length / 8));
        
        // Chữ hoa, chữ thường
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        
        // Số
        if (/\d/.test(password)) score++;
        
        // Ký tự đặc biệt
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
        
        // Sự kết hợp
        if (/[A-Z].*[0-9]|[0-9].*[A-Z]/.test(password)) score++;
        if (/[a-z].*[0-9]|[0-9].*[a-z]/.test(password)) score++;
        if (/[a-z].*[A-Z]|[A-Z].*[a-z]/.test(password)) score++;
        
        return Math.min(5, score);
    },

    // Kiểm tra số điện thoại
    validatePhone(phone) {
        const re = /^(0|\+84)(\s|\.)?((3[2-9])|(5[689])|(7[06-9])|(8[1-689])|(9[0-46-9]))(\d)(\s|\.)?(\d{3})(\s|\.)?(\d{3})$/;
        return re.test(phone);
    },

    // Kiểm tra mã sinh viên
    validateStudentId(studentId) {
        // Định dạng: 2 chữ cái + 6-8 số
        const re = /^[A-Za-z]{2}\d{6,8}$/;
        return re.test(studentId);
    },

    // Kiểm tra ngày giờ
    validateDateTime(dateTime) {
        const date = new Date(dateTime);
        return date instanceof Date && !isNaN(date);
    },

    // Kiểm tra form đăng ký
    validateRegistrationForm(formData) {
        const errors = {};

        // Kiểm tra email
        if (!formData.email || !this.validateEmail(formData.email)) {
            errors.email = 'Email không hợp lệ';
        }

        // Kiểm tra mật khẩu
        const passwordValidation = this.validatePassword(formData.password);
        if (!passwordValidation.isValid) {
            errors.password = passwordValidation.errors;
        }

        // Kiểm tra xác nhận mật khẩu
        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
        }

        // Kiểm tra họ tên
        if (!formData.name || formData.name.length < 2) {
            errors.name = 'Họ tên phải có ít nhất 2 ký tự';
        }

        // Kiểm tra số điện thoại
        if (formData.phone && !this.validatePhone(formData.phone)) {
            errors.phone = 'Số điện thoại không hợp lệ';
        }

        // Kiểm tra mã sinh viên nếu là sinh viên
        if (formData.role === 'student' && !this.validateStudentId(formData.studentId)) {
            errors.studentId = 'Mã sinh viên không hợp lệ';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    },

    // Kiểm tra form sự kiện
    validateEventForm(formData) {
        const errors = {};

        // Kiểm tra tiêu đề
        if (!formData.title || formData.title.length < 5) {
            errors.title = 'Tiêu đề phải có ít nhất 5 ký tự';
        }

        // Kiểm tra mô tả
        if (!formData.description || formData.description.length < 20) {
            errors.description = 'Mô tả phải có ít nhất 20 ký tự';
        }

        // Kiểm tra địa điểm
        if (!formData.location) {
            errors.location = 'Vui lòng nhập địa điểm';
        }

        // Kiểm tra thời gian
        if (!this.validateDateTime(formData.startTime)) {
            errors.startTime = 'Thời gian bắt đầu không hợp lệ';
        }

        if (!this.validateDateTime(formData.endTime)) {
            errors.endTime = 'Thời gian kết thúc không hợp lệ';
        }

        if (new Date(formData.endTime) <= new Date(formData.startTime)) {
            errors.endTime = 'Thời gian kết thúc phải sau thời gian bắt đầu';
        }

        // Kiểm tra sức chứa
        if (formData.capacity && (isNaN(formData.capacity) || formData.capacity < 1)) {
            errors.capacity = 'Sức chứa phải là số dương';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
};

// Khởi tạo ValidationService khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    // Thêm validation cho các form
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formType = form.getAttribute('data-validate');
            const formData = Object.fromEntries(new FormData(form));
            
            let validation;
            switch (formType) {
                case 'registration':
                    validation = ValidationService.validateRegistrationForm(formData);
                    break;
                case 'event':
                    validation = ValidationService.validateEventForm(formData);
                    break;
                default:
                    return true;
            }

            if (validation.isValid) {
                form.submit();
            } else {
                // Hiển thị lỗi
                Object.entries(validation.errors).forEach(([field, error]) => {
                    const input = form.querySelector(`[name="${field}"]`);
                    const feedback = input.nextElementSibling;
                    if (feedback && feedback.classList.contains('invalid-feedback')) {
                        feedback.textContent = Array.isArray(error) ? error[0] : error;
                    }
                    input.classList.add('is-invalid');
                });

                // Thông báo lỗi
                NotificationService.createNotification(
                    'Lỗi nhập liệu',
                    'Vui lòng kiểm tra lại thông tin đã nhập',
                    'error'
                );
            }
        });
    });

    // Thêm kiểm tra mật khẩu realtime
    const passwordInputs = document.querySelectorAll('input[type="password"][data-strength-meter]');
    passwordInputs.forEach(input => {
        const meterId = input.getAttribute('data-strength-meter');
        const meter = document.getElementById(meterId);
        
        input.addEventListener('input', () => {
            const validation = ValidationService.validatePassword(input.value);
            if (meter) {
                meter.style.width = `${(validation.score / 5) * 100}%`;
                meter.className = `progress-bar bg-${this._getStrengthClass(validation.score)}`;
                meter.textContent = this._getStrengthText(validation.score);
            }
        });
    });
});

// Utility functions
function _getStrengthClass(score) {
    if (score < 2) return 'danger';
    if (score < 3) return 'warning';
    if (score < 4) return 'info';
    return 'success';
}

function _getStrengthText(score) {
    if (score < 2) return 'Yếu';
    if (score < 3) return 'Trung bình';
    if (score < 4) return 'Khá';
    return 'Mạnh';
}