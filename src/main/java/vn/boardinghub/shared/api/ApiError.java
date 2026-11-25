package vn.boardinghub.shared.api;
import java.time.Instant; import java.util.List;
public record ApiError(boolean success,String code,String message,List<FieldError> errors,String path,Instant timestamp){
 public record FieldError(String field,String message){}
 public static ApiError of(String code,String message,List<FieldError> errors,String path){return new ApiError(false,code,message,errors,path,Instant.now());}
}
