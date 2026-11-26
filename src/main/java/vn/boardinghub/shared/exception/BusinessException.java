package vn.boardinghub.shared.exception;
import org.springframework.http.HttpStatus;
public class BusinessException extends RuntimeException {
 private final String code; private final HttpStatus status;
 public BusinessException(String code,String message,HttpStatus status){super(message);this.code=code;this.status=status;}
 public String getCode(){return code;} public HttpStatus getStatus(){return status;}
 public static BusinessException notFound(String entity){return new BusinessException("RESOURCE_NOT_FOUND",entity+" not found",HttpStatus.NOT_FOUND);}
 public static BusinessException conflict(String message){return new BusinessException("CONFLICT",message,HttpStatus.CONFLICT);}
 public static BusinessException badRequest(String message){return new BusinessException("BAD_REQUEST",message,HttpStatus.BAD_REQUEST);}
}
