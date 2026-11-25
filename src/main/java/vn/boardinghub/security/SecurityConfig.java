package vn.boardinghub.security;
import vn.boardinghub.security.jwt.JwtAuthFilter; import org.springframework.context.annotation.*; import org.springframework.security.config.annotation.web.builders.HttpSecurity; import org.springframework.security.config.http.SessionCreationPolicy; import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder; import org.springframework.security.crypto.password.PasswordEncoder; import org.springframework.security.web.SecurityFilterChain; import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
@Configuration public class SecurityConfig {
 @Bean SecurityFilterChain security(HttpSecurity http,JwtAuthFilter jwt)throws Exception{return http.csrf(c->c.disable()).cors(c->{}).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS)).authorizeHttpRequests(a->a.requestMatchers("/api/v1/auth/**","/swagger-ui/**","/v3/api-docs/**","/actuator/health").permitAll().anyRequest().authenticated()).addFilterBefore(jwt,UsernamePasswordAuthenticationFilter.class).build();}
 @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder();}
}
