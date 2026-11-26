package vn.boardinghub.shared.exception;
import jakarta.servlet.http.HttpServletRequest; import org.springframework.http.*; import org.springframework.web.bind.MethodArgumentNotValidException; import org.springframework.web.bind.annotation.*; import org.springframework.dao.DataIntegrityViolationException; import java.util.*; import vn.boardinghub.shared.api.ApiError;
@RestControllerAdvice
public class GlobalExceptionHandler {
 @ExceptionHandler(BusinessException.class) ResponseEntity<ApiError> business(BusinessException e,HttpServletRequest req){return ResponseEntity.status(e.getStatus()).body(ApiError.of(e.getCode(),e.getMessage(),List.of(),req.getRequestURI()));}
 @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<ApiError> validation(MethodArgumentNotValidException e,HttpServletRequest req){var errors=e.getBindingResult().getFieldErrors().stream().map(x->new ApiError.FieldError(x.getField(),x.getDefaultMessage())).toList();return ResponseEntity.badRequest().body(ApiError.of("VALIDATION_ERROR","Input validation failed",errors,req.getRequestURI()));}
 @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<ApiError> invalid(IllegalArgumentException e,HttpServletRequest req){return ResponseEntity.badRequest().body(ApiError.of("BAD_REQUEST",e.getMessage(),List.of(),req.getRequestURI()));}
 @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<ApiError> integrity(Exception e,HttpServletRequest req){return ResponseEntity.status(409).body(ApiError.of("DATA_CONFLICT","Data constraint conflict",List.of(),req.getRequestURI()));}
 @ExceptionHandler(Exception.class) ResponseEntity<ApiError> unknown(Exception e,HttpServletRequest req){return ResponseEntity.status(500).body(ApiError.of("INTERNAL_ERROR","Unexpected server error",List.of(),req.getRequestURI()));}
}
