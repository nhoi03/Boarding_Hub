package com.boardinghub.rental;

import java.util.Map;
import org.springframework.dao.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(assignableTypes=RentalController.class)
public class RentalErrors {
    @ExceptionHandler(ResponseStatusException.class) ResponseEntity<?> status(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("message",error.getReason()==null?"Thao tác không hợp lệ.":error.getReason()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<?> invalid(MethodArgumentNotValidException error) {
        String field=error.getBindingResult().getFieldErrors().getFirst().getField();
        return ResponseEntity.badRequest().body(Map.of("message","Kiểm tra dữ liệu trường "+field+" (giá trị bắt buộc, số tiền và ngày)."));
    }
    @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<?> conflict() {
        return ResponseEntity.status(409).body(Map.of("message","Bản ghi hoặc mã tham chiếu đã tồn tại, hoặc dữ liệu không hợp lệ. Tải lại để đối chiếu."));
    }
    @ExceptionHandler(PessimisticLockingFailureException.class) ResponseEntity<?> locked() {
        return ResponseEntity.status(409).body(Map.of("message","Dữ liệu đang được xử lý ở phiên khác. Vui lòng tải lại và thử lại."));
    }
}
